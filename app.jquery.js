// jQuery Implementation
window.MapAppJQuery = (function($) {
    'use strict';
    
    let map;
    let currentMarker;
    let serviceMarkers = [];
    let searchTimeout;
    let lastSearchTime = 0;
    let currentLocation = null;
    let mockServices = [];
    
    // Rate limiting - 1 request per second
    const RATE_LIMIT_MS = 1000;
    
    // Initialize the application
    function init() {
        console.log('Initializing jQuery MapApp...');
        initMap();
        loadMockServices();
        bindEvents();
    }
    
    // Initialize Leaflet map
    function initMap() {
        if (map) {
            map.remove();
        }
        
        map = L.map('map', {
            center: [40.7128, -74.0060], // New York City (EDT timezone)
            zoom: 10,
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            tap: true,
            maxZoom: 18,
            minZoom: 3
        });
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        
        // Handle map click to clear messages
        map.on('click', function() {
            hideMessages();
        });
    }
    
    // Load mock services data
    function loadMockServices() {
        $.getJSON('mock_services.json')
            .done(function(data) {
                mockServices = data;
                console.log('Mock services loaded:', mockServices.length, 'services');
            })
            .fail(function() {
                console.warn('Could not load mock_services.json, using fallback data');
                mockServices = getFallbackServices();
            });
    }
    
    // Fallback services data
    function getFallbackServices() {
        return [
            {
                id: 1,
                name: "Mount Sinai Hospital",
                category: "Healthcare",
                lat: 40.7895,
                lon: -73.9531,
                address: "1 Gustave L. Levy Pl, New York, NY 10029"
            },
            {
                id: 2,
                name: "Chase Bank",
                category: "Banking", 
                lat: 40.7589,
                lon: -73.9851,
                address: "270 Park Ave, New York, NY 10017"
            },
            {
                id: 3,
                name: "Times Square",
                category: "Shopping",
                lat: 40.7580,
                lon: -73.9855,
                address: "Times Square, New York, NY 10036"
            }
        ];
    }
    
    // Bind event handlers
    function bindEvents() {
        // Search button click
        $('#searchBtn').off('click').on('click', function() {
            const zipcode = $('#zipcodeInput').val().trim();
            if (zipcode) {
                searchZipcode(zipcode);
            } else {
                showError('Please enter a zipcode');
            }
        });
        
        // Enter key in input
        $('#zipcodeInput').off('keypress').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                $('#searchBtn').click();
            }
        });
        
        // Input change with debounce
        $('#zipcodeInput').off('input').on('input', function() {
            const zipcode = $(this).val().trim();
            hideMessages();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Set new timeout for auto-search
            if (zipcode.length >= 3) {
                searchTimeout = setTimeout(() => {
                    searchZipcode(zipcode);
                }, 1500); // Auto-search after 1.5 seconds of no typing
            }
        });
        
        // Find services button
        $('#findServicesBtn').off('click').on('click', function() {
            if (currentLocation) {
                findNearestServices();
            }
        });
    }
    
    // Search zipcode using Nominatim API
    function searchZipcode(zipcode) {
        const now = Date.now();
        
        // Rate limiting check
        if (now - lastSearchTime < RATE_LIMIT_MS) {
            const waitTime = RATE_LIMIT_MS - (now - lastSearchTime);
            showStatus(`Please wait ${Math.ceil(waitTime/1000)} seconds before searching again`);
            return;
        }
        
        showLoading(true);
        hideMessages();
        
        const query = encodeURIComponent(zipcode);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5&email=demo@example.com`;
        
        lastSearchTime = now;
        
        $.ajax({
            url: url,
            method: 'GET',
            timeout: 10000
        })
        .done(function(data) {
            showLoading(false);
            
            if (data && data.length > 0) {
                const result = data[0]; // Take first result
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                
                if (isValidCoordinate(lat, lon)) {
                    showLocationOnMap(lat, lon, result.display_name);
                    currentLocation = { lat, lon, name: result.display_name };
                    showStatus(`Found: ${result.display_name}`);
                    $('#servicesContainer').show();
                } else {
                    showError('Invalid coordinates received');
                }
            } else {
                showError('Zipcode not found. Try adding city or country name.');
                $('#servicesContainer').hide();
            }
        })
        .fail(function(xhr, status, error) {
            showLoading(false);
            
            if (xhr.status === 429) {
                showError('Rate limit exceeded. Please wait before searching again.');
            } else if (status === 'timeout') {
                showError('Search timeout. Please try again.');
            } else {
                showError('Search failed. Please check your connection and try again.');
            }
            
            console.error('Search error:', status, error);
            $('#servicesContainer').hide();
        });
    }
    
    // Validate coordinates
    function isValidCoordinate(lat, lon) {
        return !isNaN(lat) && !isNaN(lon) && 
               lat >= -90 && lat <= 90 && 
               lon >= -180 && lon <= 180;
    }
    
    // Show location on map
    function showLocationOnMap(lat, lon, name) {
        // Remove existing marker
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        
        // Create custom marker
        const customIcon = L.divIcon({
            className: 'custom-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        // Add new marker
        currentMarker = L.marker([lat, lon], { icon: customIcon })
            .addTo(map)
            .bindPopup(`<strong>📍 ${name}</strong><br><small>${lat.toFixed(4)}, ${lon.toFixed(4)}</small>`)
            .openPopup();
        
        // Center and zoom map to location
        map.setView([lat, lon], 13);
    }
    
    // Find nearest services
    function findNearestServices() {
        if (!currentLocation || mockServices.length === 0) {
            showError('No location set or services data unavailable');
            return;
        }
        
        // Calculate distances and sort
        const servicesWithDistance = mockServices.map(service => {
            const distance = calculateDistance(
                currentLocation.lat, 
                currentLocation.lon, 
                service.lat, 
                service.lon
            );
            return { ...service, distance };
        }).sort((a, b) => a.distance - b.distance);
        
        // Show top 5 nearest services
        const nearestServices = servicesWithDistance.slice(0, 5);
        displayServices(nearestServices);
        showServicesOnMap(nearestServices);
    }
    
    // Calculate distance using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    function toRad(deg) {
        return deg * (Math.PI/180);
    }
    
    // Display services list
    function displayServices(services) {
        const $servicesList = $('#servicesList');
        $servicesList.empty();
        
        if (services.length === 0) {
            $servicesList.html('<p>No services found nearby.</p>');
            return;
        }
        
        services.forEach(service => {
            const $serviceItem = $(`
                <div class="service-item">
                    <div class="service-name">${service.name}</div>
                    <div class="service-category">📂 ${service.category}</div>
                    <div class="service-distance">📍 ${service.distance.toFixed(2)} km away</div>
                    ${service.address ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">${service.address}</div>` : ''}
                </div>
            `);
            
            // Click to center on service
            $serviceItem.on('click', function() {
                map.setView([service.lat, service.lon], 15);
                
                // Find and open popup for this service marker
                serviceMarkers.forEach(marker => {
                    if (marker.options.serviceId === service.id) {
                        marker.openPopup();
                    }
                });
            });
            
            $servicesList.append($serviceItem);
        });
    }
    
    // Show services on map
    function showServicesOnMap(services) {
        // Clear existing service markers
        serviceMarkers.forEach(marker => map.removeLayer(marker));
        serviceMarkers = [];
        
        // Add service markers
        services.forEach(service => {
            const serviceIcon = L.divIcon({
                className: 'service-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            const marker = L.marker([service.lat, service.lon], { 
                icon: serviceIcon,
                serviceId: service.id
            })
            .addTo(map)
            .bindPopup(`
                <strong>🏢 ${service.name}</strong><br>
                <em>${service.category}</em><br>
                <small>📍 ${service.distance.toFixed(2)} km away</small>
                ${service.address ? `<br><small>${service.address}</small>` : ''}
            `);
            
            serviceMarkers.push(marker);
        });
        
        // Fit map to show all markers
        if (services.length > 0) {
            const group = new L.featureGroup([currentMarker, ...serviceMarkers]);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    // UI Helper Functions
    function showLoading(show) {
        const $searchBtn = $('#searchBtn');
        const $searchText = $('.search-text');
        const $loadingSpinner = $('.loading-spinner');
        
        if (show) {
            $searchBtn.prop('disabled', true);
            $searchText.hide();
            $loadingSpinner.show();
        } else {
            $searchBtn.prop('disabled', false);
            $searchText.show();
            $loadingSpinner.hide();
        }
    }
    
    function showError(message) {
        $('#errorMessage').text(message).show();
        $('#statusMessage').hide();
    }
    
    function showStatus(message) {
        $('#statusMessage').text(message).show();
        $('#errorMessage').hide();
    }
    
    function hideMessages() {
        $('#errorMessage, #statusMessage').hide();
    }
    
    // Destroy function for cleanup
    function destroy() {
        if (map) {
            map.remove();
            map = null;
        }
        currentMarker = null;
        serviceMarkers = [];
        currentLocation = null;
        
        // Clear timeouts
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Unbind events
        $('#searchBtn, #zipcodeInput, #findServicesBtn').off();
        
        console.log('jQuery MapApp destroyed');
    }
    
    // Public API
    return {
        init: init,
        destroy: destroy,
        searchZipcode: searchZipcode,
        findNearestServices: findNearestServices
    };
    
})(jQuery);
