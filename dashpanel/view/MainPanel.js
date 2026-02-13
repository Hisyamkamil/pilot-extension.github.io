Ext.define('Store.dashpanel.view.MainPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.dashpanel.mainpanel',
    
    // Ensure DTCHandler is loaded as a dependency
    requires: [
        'Store.dashpanel.view.DTCHandler'
    ],
    
    // Configuration properties
    config: null,
    refreshTask: null,
    currentVehicleId: null,
    currentVehicleName: null,
    currentVehicleRecord: null,
    vehicleSensorMappings: null,
    sensorIdToTagMapping: null,

    /**
     * Initialize main sensor panel component
     */
    initComponent: function() {
        var me = this;
        
        // Get configuration from parent module
        me.config = me.moduleConfig || me.getDefaultConfig();
        
        // Configure panel properties
        me.title = 'Sensor Monitor - Sensor Data';
        me.height = me.config.ui.panelHeight;
        me.dock = 'bottom';
        me.split = true;
        me.resizable = me.config.ui.resizable;
        me.collapsible = me.config.ui.collapsible;
        me.collapsed = false;
        me.collapseFirst = true;
        me.animCollapse = me.config.ui.animCollapse;
        me.collapseDirection = 'bottom';
        me.titleCollapse = true;
        me.collapseMode = 'mini';
        me.layout = 'fit';
        me.hidden = true;
        me.id = 'dashpanel-main-panel';
        
        // Configure header
        me.header = {
            titlePosition: 1,
            cls: 'dashpanel-compact-header'
        };
        
        // Configure panel items
        me.items = [{
            xtype: 'tabpanel',
            itemId: 'sensorGroupTabs',
            plain: true,
            deferredRender: false,
            cls: 'dashpanel-sensor-tabs',
            defaults: {
                layout: 'fit',
                scrollable: true,
                autoDestroy: false
            },
            items: []
        }];
        
        me.callParent(arguments);
        console.log('✅ MainPanel component initialized');
    },

    /**
     * Get default configuration if not provided
     * @returns {Object} Default configuration
     */
    getDefaultConfig: function() {
        return {
            ui: { panelHeight: 325, resizable: true, collapsible: true, animCollapse: 300, tabIcon: 'fa fa-list-alt' },
            sensors: { dtcDetectionKeyword: 'group by active dtc', defaultColumns: 3 },
            colors: { normal: '#008000', warning: '#ff8c00', critical: '#ff0000' },
            icons: { default: 'fa fa-microchip' },
            api: { url: '/ax/current_data.php', timeout: 30000 },
            refresh: { interval: 500, minInterval: 100, maxInterval: 10000 }
        };
    },

    /**
     * Show vehicle sensors (called from Module when vehicle selected)
     * @param {string} vehicleId - Vehicle ID
     * @param {string} vehicleName - Vehicle name
     * @param {Object} vehicleRecord - Vehicle record
     */
    showVehicleSensors: function(vehicleId, vehicleName, vehicleRecord) {
        var me = this;
        
        console.log('🚗 MainPanel: Vehicle selected:', vehicleName, 'ID:', vehicleId);
        
        me.currentVehicleId = vehicleId;
        me.currentVehicleName = vehicleName;
        me.currentVehicleRecord = vehicleRecord;
        
        me.setTitle('Sensor Monitor - ' + vehicleName);
        
        // Load vehicle-specific sensor mappings first, then load data
        me.loadVehicleSensorMappings(vehicleId, function() {
            me.loadVehicleSensorData(vehicleId);
            me.startRefreshTimer(vehicleId);
        });
        
        console.log('✅ MainPanel: Vehicle sensor loading initiated');
    },

    /**
     * Load vehicle-specific sensor mappings
     * @param {string} vehicleId - Vehicle ID
     * @param {Function} callback - Callback function
     */
    loadVehicleSensorMappings: function(vehicleId, callback) {
        var me = this;
        
        console.log('🔄 MainPanel: Loading sensor mappings for vehicle:', vehicleId);
        
        Ext.Ajax.request({
            url: '/ax/sensors/sensors.php',
            method: 'POST',
            timeout: 30000,
            params: {
                agent_id: vehicleId,
                page: 1,
                start: 0,
                limit: 100
            },
            success: function(response) {
                try {
                    var sensors = Ext.decode(response.responseText);
                    me.processVehicleSensorMappings(sensors);
                    console.log('✅ MainPanel: Vehicle sensor mappings loaded:', Object.keys(me.vehicleSensorMappings || {}).length, 'mappings');
                } catch (e) {
                    console.warn('⚠️ MainPanel: Failed to parse vehicle sensor mappings:', e);
                    me.vehicleSensorMappings = {};
                }
                callback();
            },
            failure: function(response) {
                console.warn('⚠️ MainPanel: Failed to load vehicle sensor mappings:', response.status);
                me.vehicleSensorMappings = {};
                callback();
            }
        });
    },

    /**
     * Process vehicle sensor mappings response
     * @param {Array} sensors - Array of sensor objects
     */
    processVehicleSensorMappings: function(sensors) {
        var me = this;
        me.vehicleSensorMappings = {};
        me.sensorIdToTagMapping = {};
        
        if (Ext.isArray(sensors)) {
            Ext.each(sensors, function(sensor) {
                if (sensor.sensorid && sensor.tags && Ext.isArray(sensor.tags) && sensor.tags.length > 0) {
                    // Map sensor ID to first tag ID (primary tag)
                    me.sensorIdToTagMapping[sensor.sensorid] = sensor.tags[0];
                }
                
                if (sensor.info && sensor.tags && Ext.isArray(sensor.tags) && sensor.tags.length > 0) {
                    // Also map sensor name to first tag ID for fallback
                    me.vehicleSensorMappings[sensor.info.toLowerCase()] = sensor.tags[0];
                }
            });
        }
        
        console.log('✅ MainPanel: Vehicle sensor mappings processed:',
                   Object.keys(me.sensorIdToTagMapping).length, 'sensor ID mappings,',
                   Object.keys(me.vehicleSensorMappings).length, 'name mappings');
    },

    /**
     * Load vehicle sensor data from API
     * @param {string} vehicleId - Vehicle ID
     */
    loadVehicleSensorData: function(vehicleId) {
        var me = this;
        
        if (!me.currentVehicleId) return;
        
        console.log('🔄 MainPanel: Loading sensor data for vehicle:', me.currentVehicleId);
        
        Ext.Ajax.request({
            url: me.config.api.url,
            timeout: me.config.api.timeout,
            success: function(response) {
                me.handleAPIResponse(response);
            },
            failure: function(response) {
                console.error('❌ MainPanel: API failed:', response.status);
                me.showNoDataMessage();
            }
        });
    },

    /**
     * Handle API response
     * @param {Object} response - AJAX response
     */
    handleAPIResponse: function(response) {
        var me = this;
        
        try {
            var data = Ext.decode(response.responseText);
            me.processSensorData(data);
        } catch (e) {
            console.error('❌ MainPanel: API parse error:', e);
            me.showNoDataMessage();
        }
    },

    /**
     * Process sensor data from API
     * @param {Object} data - API response data
     */
    processSensorData: function(data) {
        var me = this;
        var sensorGroups = {};
        
        console.log('MainPanel: Processing sensor data...');
        
        if (!me.isValidAPIResponse(data)) {
            me.showNoDataMessage();
            return;
        }

        var vehicle = me.findVehicleInData(data);
        if (!vehicle) {
            console.error('❌ MainPanel: Vehicle not found:', me.currentVehicleId);
            me.showNoDataMessage();
            return;
        }

        me.addBasicVehicleSensors(sensorGroups, vehicle);
        me.processSensorsByGroup(sensorGroups, vehicle);
        
        if (Object.keys(sensorGroups).length === 0) {
            me.showNoDataMessage();
            return;
        }

        console.log('✅ MainPanel: Created', Object.keys(sensorGroups).length, 'sensor groups');
        me.updateSensorTabs(sensorGroups);
    },

    /**
     * Validate API response
     * @param {Object} data - API response data
     * @returns {boolean} True if valid
     */
    isValidAPIResponse: function(data) {
        return data && data.c === 0 && Ext.isArray(data.objects);
    },

    /**
     * Find vehicle in API data
     * @param {Object} data - API response data
     * @returns {Object|null} Vehicle object or null
     */
    findVehicleInData: function(data) {
        var me = this;
        var vehicle = null;
        
        Ext.each(data.objects, function(obj) {
            if (obj.id == me.currentVehicleId || obj.veh_id == me.currentVehicleId) {
                vehicle = obj;
                return false;
            }
        });
        
        return vehicle;
    },

    /**
     * Add vehicle information tab with complete vehicle details
     * @param {Object} sensorGroups - Sensor groups object
     * @param {Object} vehicle - Vehicle data from current_data API
     */
    addBasicVehicleSensors: function(sensorGroups, vehicle) {
        var me = this;
        
        if (!sensorGroups['Vehicle Information']) {
            sensorGroups['Vehicle Information'] = [];
        }

        // Get vehicle details from navigation tree record
        var vehicleRecord = me.currentVehicleRecord;
        
        if (vehicleRecord) {
            // Vehicle Details Section
            sensorGroups['Vehicle Information'].push(me.createVehicleInfoSection('Vehicle Details', [
                { label: 'Vehicle Name', value: vehicleRecord.get('name') || vehicle.name || '-' },
                { label: 'Model', value: vehicleRecord.get('model') || '-' },
                { label: 'Year', value: vehicleRecord.get('year') || '-' },
                { label: 'VIN', value: vehicleRecord.get('vin') || '-' },
                { label: 'Type', value: vehicleRecord.get('typename') || '-' }
            ]));

            // License Information Section
            sensorGroups['Vehicle Information'].push(me.createVehicleInfoSection('License Information', [
                { label: 'License Number', value: vehicleRecord.get('veh_license') || '-' },
                { label: 'License Expiry', value: vehicleRecord.get('veh_lic_exp') || '-' },
                { label: 'Insurance Certificate', value: vehicleRecord.get('veh_ins_sert') || '-' }
            ]));

            // Location & Last Event Section
            if (vehicle.last_event) {
                sensorGroups['Vehicle Information'].push(me.createVehicleInfoSection('Location & Last Event', [
                    { label: 'Current Location', value: vehicle.lat && vehicle.lon ? me.formatCoordinates(vehicle.lat, vehicle.lon) : '-' },
                    { label: 'Last Event', value: vehicle.last_event.text || vehicle.last_event.type || '-' },
                    { label: 'Last Event Time', value: vehicle.last_event.unixtimestamp ? me.formatTimestamp(vehicle.last_event.unixtimestamp) : '-' },
                    { label: 'Satellites', value: vehicle.satsinview || '-' }
                ]));
            }
        }
    },

    /**
     * Create vehicle information section HTML
     * @param {string} sectionTitle - Section title
     * @param {Array} items - Array of {label, value, status} objects
     * @returns {string} Section HTML
     */
    createVehicleInfoSection: function(sectionTitle, items) {
        var sectionHtml = '<div style="margin-bottom: 15px;">';
        sectionHtml += '<h4 style="margin: 0 0 8px 0; padding: 5px 0; border-bottom: 1px solid #ddd; color: #333; font-size: 12px; font-weight: bold;">' + sectionTitle + '</h4>';
        
        Ext.each(items, function(item) {
            var statusColor = item.status === 'warning' ? '#ff8c00' : item.status === 'critical' ? '#ff0000' : '#333';
            sectionHtml += '<div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px;">';
            sectionHtml += '<span style="color: #666; font-weight: 500;">' + item.label + ':</span>';
            sectionHtml += '<span style="color: ' + statusColor + '; font-weight: bold;">' + item.value + '</span>';
            sectionHtml += '</div>';
        });
        
        sectionHtml += '</div>';
        return sectionHtml;
    },

    /**
     * Format motor hours for display
     * @param {number} motorHours - Motor hours in seconds or hours
     * @returns {string} Formatted motor hours
     */
    formatMotorHours: function(motorHours) {
        if (!motorHours || motorHours === 0) return '0 hrs';
        
        // If value is very large, assume it's in seconds, convert to hours
        if (motorHours > 100000) {
            var hours = Math.floor(motorHours / 3600);
            return hours.toLocaleString() + ' hrs';
        }
        
        return motorHours.toLocaleString() + ' hrs';
    },

    /**
     * Format coordinates for display
     * @param {string|number} lat - Latitude
     * @param {string|number} lon - Longitude
     * @returns {string} Formatted coordinates
     */
    formatCoordinates: function(lat, lon) {
        if (!lat || !lon || lat == 0 || lon == 0) return 'No GPS Signal';
        return parseFloat(lat).toFixed(6) + ', ' + parseFloat(lon).toFixed(6);
    },

    /**
     * Format timestamp for display
     * @param {string|number} timestamp - Unix timestamp
     * @returns {string} Formatted date/time
     */
    formatTimestamp: function(timestamp) {
        if (!timestamp) return 'N/A';
        var date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleString();
    },

    /**
     * Process sensors by group
     * @param {Object} sensorGroups - Sensor groups object
     * @param {Object} vehicle - Vehicle data
     */
    processSensorsByGroup: function(sensorGroups, vehicle) {
        var me = this;
        
        if (!vehicle.sensors || typeof vehicle.sensors !== 'object') {
            return;
        }

        console.log('MainPanel: Processing', Object.keys(vehicle.sensors).length, 'sensors...');
        
        Ext.Object.each(vehicle.sensors, function(sensorName, sensorValue) {
            if (me.isDTCSensor(sensorName)) {
                me.processDTCSensor(sensorGroups, sensorValue);
            } else {
                me.processRegularSensor(sensorGroups, sensorName, sensorValue);
            }
        });
    },

    /**
     * Check if sensor is DTC sensor
     * @param {string} sensorName - Sensor name
     * @returns {boolean} True if DTC sensor
     */
    isDTCSensor: function(sensorName) {
        var me = this;
        var keyword = me.config.sensors.dtcDetectionKeyword.toLowerCase();
        return sensorName && sensorName.toLowerCase().includes(keyword);
    },

    /**
     * Process DTC sensor with enhanced error handling and fallback processing
     * @param {Object} sensorGroups - Sensor groups object
     * @param {string} sensorValue - DTC sensor value
     */
    processDTCSensor: function(sensorGroups, sensorValue) {
        var me = this;
        
        console.log('🔧 MainPanel: Processing DTC sensor data');
        console.log('🔧 MainPanel: DTC sensor value:', sensorValue ? sensorValue.substring(0, 100) + '...' : 'Empty');
        
        if (!sensorGroups['Active DTC']) {
            sensorGroups['Active DTC'] = [];
        }

        // Validate input data
        if (!sensorValue || typeof sensorValue !== 'string') {
            console.warn('⚠️ MainPanel: Invalid DTC sensor value received');
            sensorGroups['Active DTC'].push('<div style="text-align: center; padding: 20px; color: #ff8c00;">' +
                                          '<i class="fa fa-exclamation-triangle"></i><br>' +
                                          'Invalid DTC sensor data</div>');
            return;
        }

        try {
            // Debug: Check what's available in the namespace
            console.log('🔍 MainPanel: Debugging namespace availability:');
            console.log('🔍 MainPanel: window.Store exists:', !!(window.Store));
            console.log('🔍 MainPanel: Store exists:', !!(typeof Store !== 'undefined'));
            console.log('🔍 MainPanel: Ext.ClassManager exists:', !!(Ext.ClassManager));
            
            var dtcHandler = me.getDTCHandlerInstance();
            
            if (dtcHandler) {
                console.log('🔍 MainPanel: Processing DTC data with DTCHandler, sensor value length:', sensorValue.length);
                
                var dtcList = dtcHandler.parseDTCData(sensorValue);
                var dtcTableHtml = dtcHandler.createDTCTable(dtcList);
                
                sensorGroups['Active DTC'].push('<div class="dashpanel-dtc-container">' + dtcTableHtml + '</div>');
                
                var count = dtcList ? dtcList.length : 0;
                console.log('✅ MainPanel: Successfully added', count, 'DTCs to display');
            } else {
                // Fallback: Use simple DTC display without parsing
                console.warn('⚠️ MainPanel: DTCHandler not available, using fallback display');
                me.createFallbackDTCDisplay(sensorGroups, sensorValue);
            }
            
        } catch (e) {
            console.error('❌ MainPanel: Error processing DTC data');
            console.error('❌ MainPanel: Error details:', e.message);
            console.error('❌ MainPanel: Stack trace:', e.stack);
            
            // Try fallback method on error
            try {
                console.log('🔄 MainPanel: Attempting fallback DTC processing');
                me.createFallbackDTCDisplay(sensorGroups, sensorValue);
            } catch (fallbackError) {
                console.error('❌ MainPanel: Fallback also failed:', fallbackError.message);
                
                var errorMessage = 'DTCHandler unavailable and fallback failed';
                if (e.message) {
                    errorMessage += ': ' + e.message;
                }
                
                sensorGroups['Active DTC'].push('<div style="text-align: center; padding: 20px; color: #d73027;">' +
                                              '<i class="fa fa-exclamation-triangle"></i><br>' +
                                              '<strong>DTC Processing Error</strong><br>' +
                                              '<small>' + errorMessage + '</small><br>' +
                                              '<small>Raw sensor value: ' + (sensorValue ? sensorValue.substring(0, 50) + '...' : 'None') + '</small></div>');
            }
        }
    },

    /**
     * Get DTCHandler singleton instance (should be loaded via requires)
     * @returns {Object|null} DTCHandler instance or null
     */
    getDTCHandlerInstance: function() {
        // Since DTCHandler is declared in requires, it should be available via Store namespace
        if (Store && Store.dashpanel && Store.dashpanel.view && Store.dashpanel.view.DTCHandler) {
            console.log('🔍 MainPanel: DTCHandler singleton loaded via requires');
            return Store.dashpanel.view.DTCHandler;
        }
        
        // Fallback: Try ExtJS class manager
        try {
            var DTCHandlerClass = Ext.ClassManager.get('Store.dashpanel.view.DTCHandler');
            if (DTCHandlerClass) {
                console.log('🔍 MainPanel: DTCHandler found via ClassManager');
                return DTCHandlerClass;
            }
        } catch (e) {
            console.warn('MainPanel: ClassManager lookup failed:', e.message);
        }
        
        console.error('❌ MainPanel: DTCHandler not available. Check if DTCHandler.js file exists and is properly loaded.');
        return null;
    },

    /**
     * Create fallback DTC display when DTCHandler is not available
     * @param {Object} sensorGroups - Sensor groups object
     * @param {string} sensorValue - Raw DTC sensor value
     */
    createFallbackDTCDisplay: function(sensorGroups, sensorValue) {
        var me = this;
        
        console.log('🔄 MainPanel: Creating fallback DTC display');
        
        // Simple parsing of DTC entries (basic fallback)
        var dtcEntries = sensorValue.split(';');
        var validEntries = [];
        
        Ext.each(dtcEntries, function(entry) {
            if (entry && entry.trim().length > 0) {
                validEntries.push(entry.trim());
            }
        });
        
        var fallbackHtml = '';
        
        if (validEntries.length > 0) {
            fallbackHtml = '<div style="padding: 10px;">' +
                          '<h4 style="margin: 0 0 10px 0; color: #d73027;">' +
                          '<i class="fa fa-exclamation-triangle"></i> ' +
                          'Active Diagnostic Trouble Codes (' + validEntries.length + ')' +
                          '</h4>' +
                          '<div style="background: #f9f9f9; padding: 10px; border: 1px solid #ddd; font-family: monospace; font-size: 11px;">';
            
            Ext.each(validEntries, function(entry, index) {
                fallbackHtml += '<div style="margin: 3px 0;">' +
                               '<strong>DTC ' + (index + 1) + ':</strong> ' + entry +
                               '</div>';
            });
            
            fallbackHtml += '</div>' +
                           '<div style="margin-top: 10px; font-size: 10px; color: #666;">' +
                           '<em>Note: DTCHandler not available. Showing raw DTC data.</em>' +
                           '</div></div>';
        } else {
            // No DTCs
            fallbackHtml = '<div style="text-align: center; padding: 20px; color: #666;">' +
                          '<i class="fa fa-check-circle" style="font-size: 24px; color: #00a65a;"></i>' +
                          '<h4 style="margin: 10px 0;">No Active DTCs</h4>' +
                          '<p>All systems operating normally</p>' +
                          '</div>';
        }
        
        sensorGroups['Active DTC'].push('<div class="dashpanel-dtc-container">' + fallbackHtml + '</div>');
        
        console.log('✅ MainPanel: Fallback DTC display created with', validEntries.length, 'entries');
    },

    /**
     * Process regular sensor
     * @param {Object} sensorGroups - Sensor groups object
     * @param {string} sensorName - Sensor name
     * @param {string} sensorValue - Sensor value
     */
    processRegularSensor: function(sensorGroups, sensorName, sensorValue) {
        var me = this;
        var parts = sensorValue.split('|');
        
        if (parts.length >= 5) {
            var humanValue = parts[0];
            var sensorId = parts[2]; // Sensor ID from API response
            var digitalValue = parseFloat(parts[3]);
            var groupName = parts[4] || 'No Group';
            
            // Check if sensor belongs to DTC group
            if (groupName.toLowerCase() === 'dtc') {
                console.log('🔍 MainPanel: Sensor with DTC group detected:', sensorName);
                me.processDTCSensor(sensorGroups, sensorValue);
                return; // Exit early for DTC sensors
            }
            
            var sensorType = me.determineSensorType(sensorName);
            var status = me.calculateSensorStatus(digitalValue, sensorType);
            
            if (!sensorGroups[groupName]) {
                sensorGroups[groupName] = [];
            }
            
            sensorGroups[groupName].push(me.createSensorRow({
                name: sensorName,
                type: sensorType,
                value: digitalValue,
                unit: me.extractUnit(humanValue),
                status: status,
                sensorId: sensorId,
                icon: me.getSensorIconById(sensorId, sensorName, sensorType)
            }));
        }
    },

    /**
     * Create sensor row HTML (using V3 inline style approach for tight spacing)
     * @param {Object} sensor - Sensor object
     * @returns {string} HTML row
     */
    createSensorRow: function(sensor) {
        var me = this;
        var statusColor = me.getStatusColor(sensor.status);
        var sensorIcon = sensor.icon || me.getSensorIcon(sensor.name, sensor.type);
        var formattedValue = me.formatSensorValue(sensor.value);
        
        // V3-style inline layout for precise spacing
        return '<div style="' +
               'display: flex; ' +
               'align-items: center; ' +
               'padding: 3px 0; ' +
               'font-size: 11px; ' +
               'line-height: 1.2;' +
               '">' +
               '<i class="' + sensorIcon + '" style="' +
               'color: ' + statusColor + '; ' +
               'width: 16px; ' +
               'margin-right: 6px; ' +
               'font-size: 12px;' +
               '"></i>' +
               '<span style="' +
               'flex: 1; ' +
               'font-weight: 500; ' +
               'color: #333; ' +
               'overflow: hidden; ' +
               'text-overflow: ellipsis; ' +
               'white-space: nowrap;' +
               '">' + sensor.name + '</span>' +
               '<span style="' +
               'font-weight: bold; ' +
               'color: ' + statusColor + '; ' +
               'margin-left: 5px;' +
               '">' + formattedValue + '</span>' +
               '<span style="' +
               'color: #666; ' +
               'font-size: 10px; ' +
               'margin-left: 2px;' +
               '">' + (sensor.unit || '') + '</span>' +
               '</div>';
    },

    /**
     * Get status color from configuration
     * @param {string} status - Status string
     * @returns {string} Color hex code
     */
    getStatusColor: function(status) {
        var me = this;
        return me.config.colors[status] || me.config.colors.normal;
    },

    /**
     * Get sensor icon using sensor ID mapping (primary method)
     * @param {string} sensorId - Sensor ID from API response
     * @param {string} sensorName - Sensor name (fallback)
     * @param {string} sensorType - Sensor type (fallback)
     * @returns {string} CSS icon class
     */
    getSensorIconById: function(sensorId, sensorName, sensorType) {
        var me = this;
        
        // First priority: Use sensor ID to tag ID mapping
        if (me.sensorIdToTagMapping && sensorId && me.sensorIdToTagMapping[sensorId]) {
            var tagId = me.sensorIdToTagMapping[sensorId];
            
            if (window.dashpanelModule && window.dashpanelModule.sensorTagsById && window.dashpanelModule.sensorTagsById[tagId]) {
                return window.dashpanelModule.sensorTagsById[tagId];
            }
        }
        
        // Fallback to name-based mapping
        return me.getSensorIcon(sensorName, sensorType);
    },

    /**
     * Get sensor icon from module cache or configuration fallback (fallback method)
     * @param {string} sensorName - Sensor name
     * @param {string} sensorType - Sensor type (fallback)
     * @returns {string} CSS icon class
     */
    getSensorIcon: function(sensorName, sensorType) {
        var me = this;
        
        // Check vehicle-specific name mapping
        if (me.vehicleSensorMappings && sensorName) {
            var sensorKey = sensorName.toLowerCase();
            var tagId = me.vehicleSensorMappings[sensorKey];
            
            if (tagId && window.dashpanelModule && window.dashpanelModule.sensorTagsById && window.dashpanelModule.sensorTagsById[tagId]) {
                return window.dashpanelModule.sensorTagsById[tagId];
            }
        }
        
        // Use module's general sensor icon cache
        if (window.dashpanelModule && window.dashpanelModule.getSensorIcon) {
            return window.dashpanelModule.getSensorIcon(sensorName, sensorType);
        }
        
        // Final fallback to local config
        return me.config.icons[sensorType] || me.config.icons.default;
    },

    /**
     * Format sensor value
     * @param {*} value - Sensor value
     * @returns {string} Formatted value
     */
    formatSensorValue: function(value) {
        return typeof value === 'number' ? Ext.util.Format.number(value, '0.##') : value;
    },

    /**
     * Update sensor tabs
     * @param {Object} sensorGroups - Sensor groups object
     */
    updateSensorTabs: function(sensorGroups) {
        var me = this;
        var tabPanel = me.down('[itemId=sensorGroupTabs]');
        
        if (!tabPanel) return;
        
        var activeIndex = me.getActiveTabIndex(tabPanel);
        
        tabPanel.suspendLayouts();
        
        if (me.needsTabRebuild(tabPanel, sensorGroups)) {
            me.rebuildTabs(tabPanel, sensorGroups);
            me.restoreActiveTab(tabPanel, activeIndex);
        } else {
            me.updateTabContent(tabPanel, sensorGroups);
        }
        
        tabPanel.resumeLayouts(true);
        console.log('✅ MainPanel: Tabs updated successfully');
    },

    /**
     * Get active tab index
     * @param {Object} tabPanel - Tab panel
     * @returns {number} Active tab index
     */
    getActiveTabIndex: function(tabPanel) {
        if (tabPanel.items.length > 0) {
            var activeIndex = tabPanel.items.findIndex('active', true);
            return activeIndex >= 0 ? activeIndex : 0;
        }
        return 0;
    },

    /**
     * Check if tab rebuild is needed
     * @param {Object} tabPanel - Tab panel
     * @param {Object} sensorGroups - Sensor groups
     * @returns {boolean} True if rebuild needed
     */
    needsTabRebuild: function(tabPanel, sensorGroups) {
        var existingTitles = [];
        tabPanel.items.each(function(tab) {
            existingTitles.push(tab.title);
        });
        
        var newTitles = Object.keys(sensorGroups);
        return existingTitles.length !== newTitles.length ||
               !Ext.Array.equals(existingTitles.sort(), newTitles.sort());
    },

    /**
     * Rebuild tabs
     * @param {Object} tabPanel - Tab panel
     * @param {Object} sensorGroups - Sensor groups
     */
    rebuildTabs: function(tabPanel, sensorGroups) {
        var me = this;
        
        console.log('🔄 MainPanel: Rebuilding tabs for groups:', Object.keys(sensorGroups));
        
        tabPanel.removeAll();
        
        Ext.Object.each(sensorGroups, function(groupName, sensorRows) {
            var columnsHtml = me.generateColumnsHtml(sensorRows);
            
            tabPanel.add({
                title: groupName,
                closable: false,
                iconCls: me.config.ui.tabIcon,
                html: columnsHtml,
                cls: 'dashpanel-tab-content'
            });
        });
    },

    /**
     * Restore active tab
     * @param {Object} tabPanel - Tab panel
     * @param {number} activeIndex - Active tab index
     */
    restoreActiveTab: function(tabPanel, activeIndex) {
        if (activeIndex < tabPanel.items.length) {
            tabPanel.setActiveTab(activeIndex);
        }
    },

    /**
     * Update tab content only
     * @param {Object} tabPanel - Tab panel
     * @param {Object} sensorGroups - Sensor groups
     */
    updateTabContent: function(tabPanel, sensorGroups) {
        var me = this;
        
        Ext.Object.each(sensorGroups, function(groupName, sensorRows) {
            var existingTab = me.findTabByTitle(tabPanel, groupName);
            if (existingTab) {
                var columnsHtml = me.generateColumnsHtml(sensorRows);
                existingTab.update(columnsHtml);
            }
        });
    },

    /**
     * Find tab by title
     * @param {Object} tabPanel - Tab panel
     * @param {string} title - Tab title
     * @returns {Object|null} Tab component or null
     */
    findTabByTitle: function(tabPanel, title) {
        var foundTab = null;
        tabPanel.items.each(function(tab) {
            if (tab.title === title) {
                foundTab = tab;
                return false;
            }
        });
        return foundTab;
    },

    /**
     * Generate columns HTML for sensor display
     * @param {Array} sensorRows - Array of sensor HTML rows
     * @returns {string} HTML columns
     */
    generateColumnsHtml: function(sensorRows) {
        var me = this;
        
        // Check for DTC table (requires full width)
        if (me.containsDTCTable(sensorRows)) {
            return me.generateFullWidthHTML(sensorRows);
        }
        
        // Regular sensors - multi-column layout
        return me.generateMultiColumnHTML(sensorRows);
    },

    /**
     * Check if sensor rows contain DTC table
     * @param {Array} sensorRows - Array of sensor rows
     * @returns {boolean} True if contains DTC table
     */
    containsDTCTable: function(sensorRows) {
        var containsDTC = false;
        Ext.each(sensorRows, function(row) {
            if (row.indexOf('Active Diagnostic Trouble Codes') > -1 || 
                row.indexOf('No Active DTCs') > -1) {
                containsDTC = true;
                return false;
            }
        });
        return containsDTC;
    },

    /**
     * Generate full width HTML (for DTC tables)
     * @param {Array} sensorRows - Array of sensor rows
     * @returns {string} HTML
     */
    generateFullWidthHTML: function(sensorRows) {
        var html = '';
        Ext.each(sensorRows, function(row) {
            html += row;
        });
        return '<div style="padding: 10px; width: 100%;">' + html + '</div>';
    },

    /**
     * Generate multi-column HTML (V3-style always 3 columns for consistent spacing)
     * @param {Array} sensorRows - Array of sensor rows
     * @returns {string} HTML columns
     */
    generateMultiColumnHTML: function(sensorRows) {
        // V3 approach: Always create 3 columns regardless of sensor count
        var sensorsPerColumn = Math.ceil(sensorRows.length / 3);
        var columnsHtml = '';
        
        for (var col = 0; col < 3; col++) {
            var startIdx = col * sensorsPerColumn;
            var endIdx = Math.min(startIdx + sensorsPerColumn, sensorRows.length);
            
            // Always create column div, even if empty (for consistent spacing)
            columnsHtml += '<div style="flex: 1; min-width: 200px; padding: 5px 10px;">';
            if (startIdx < sensorRows.length) {
                for (var i = startIdx; i < endIdx; i++) {
                    columnsHtml += sensorRows[i];
                }
            }
            columnsHtml += '</div>';
        }
        
        return '<div style="display: flex; flex-wrap: wrap; align-items: flex-start; padding: 10px;">' +
               columnsHtml + '</div>';
    },

    /**
     * Show no data message
     */
    showNoDataMessage: function() {
        var me = this;
        var tabPanel = me.down('[itemId=sensorGroupTabs]');
        
        if (tabPanel) {
            tabPanel.removeAll(true);
            tabPanel.add({
                title: 'No Data',
                iconCls: 'fa fa-exclamation-triangle',
                html: '<div style="text-align: center; padding: 40px; color: #666;">' +
                      '<i class="fa fa-exclamation-triangle" style="font-size: 48px; color: #ff8c00;"></i>' +
                      '<h3>No Sensor Data Available</h3>' +
                      '<p>Unable to load sensor data for this vehicle</p>' +
                      '</div>',
                cls: 'dashpanel-tab-content'
            });
            tabPanel.setActiveTab(0);
        }
    },

    /**
     * Start refresh timer
     * @param {string} vehicleId - Vehicle ID
     */
    startRefreshTimer: function(vehicleId) {
        var me = this;
        
        me.stopRefreshTimer();
        
        var refreshInterval = me.getValidatedRefreshInterval();
        
        me.refreshTask = setInterval(function() {
            me.loadVehicleSensorData(vehicleId);
        }, refreshInterval);
        
        console.log('🔄 MainPanel: Refresh timer started for vehicle:', vehicleId, 'interval:', refreshInterval + 'ms');
    },

    /**
     * Get validated refresh interval
     * @returns {number} Valid refresh interval in ms
     */
    getValidatedRefreshInterval: function() {
        var me = this;
        var interval = me.config.refresh.interval;
        var minInterval = me.config.refresh.minInterval;
        var maxInterval = me.config.refresh.maxInterval;
        
        if (interval < minInterval) {
            console.warn('MainPanel: Refresh interval too low, using minimum:', minInterval + 'ms');
            return minInterval;
        }
        
        if (interval > maxInterval) {
            console.warn('MainPanel: Refresh interval too high, using maximum:', maxInterval + 'ms');
            return maxInterval;
        }
        
        return interval;
    },

    /**
     * Stop refresh timer
     */
    stopRefreshTimer: function() {
        var me = this;
        
        if (me.refreshTask) {
            clearInterval(me.refreshTask);
            me.refreshTask = null;
            console.log('🛑 MainPanel: Refresh timer stopped');
        }
    },

    /**
     * Show main panel
     */
    showPanel: function() {
        var me = this;
        
        if (me.hidden) {
            me.setHidden(false);
            me.show();
            console.log('🔧 MainPanel: Panel shown');
        }
    },

    /**
     * Hide main panel
     */
    hidePanel: function() {
        var me = this;
        
        if (!me.hidden) {
            me.setHidden(true);
            me.hide();
            console.log('🔧 MainPanel: Panel hidden');
        }
    },

    // Helper methods for sensor processing
    
    /**
     * Determine sensor type from name
     * @param {string} sensorName - Sensor name
     * @returns {string} Sensor type
     */
    determineSensorType: function(sensorName) {
        if (!sensorName) return 'default';
        
        var name = sensorName.toLowerCase();
        if (name.includes('температур') || name.includes('temp')) return 'temperature';
        if (name.includes('давлен') || name.includes('pressure')) return 'pressure';
        if (name.includes('топлив') || name.includes('fuel') || name.includes('уровень')) return 'level';
        if (name.includes('напряж') || name.includes('voltage') || name.includes('вольт')) return 'voltage';
        if (name.includes('скорост') || name.includes('speed')) return 'speed';
        if (name.includes('нагрузк') || name.includes('вес') || name.includes('load') || name.includes('weight')) return 'weight';
        
        return 'default';
    },

    /**
     * Extract unit from human value
     * @param {string} humValue - Human readable value
     * @returns {string} Unit string
     */
    extractUnit: function(humValue) {
        if (!humValue) return '';
        
        var matches = humValue.toString().match(/([a-zA-Zа-яА-Я°%/]+)$/);
        return matches ? matches[1] : '';
    },

    /**
     * Calculate sensor status based on thresholds
     * @param {number} value - Sensor value
     * @param {string} sensorType - Sensor type
     * @returns {string} Status (normal, warning, critical, unknown)
     */
    calculateSensorStatus: function(value, sensorType) {
        var me = this;
        
        if (value === null || value === undefined) return 'unknown';
        
        var thresholds = me.config.thresholds && me.config.thresholds[sensorType];
        if (!thresholds) return 'normal';
        
        // Check critical thresholds
        if (thresholds.critical) {
            if (thresholds.critical.min !== undefined && value < thresholds.critical.min) return 'critical';
            if (thresholds.critical.max !== undefined && value > thresholds.critical.max) return 'critical';
        }
        
        // Check warning thresholds
        if (thresholds.warning) {
            if (thresholds.warning.min !== undefined && value < thresholds.warning.min) return 'warning';
            if (thresholds.warning.max !== undefined && value > thresholds.warning.max) return 'warning';
        }
        
        return 'normal';
    }
});
