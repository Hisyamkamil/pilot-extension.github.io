Ext.define('Store.dashpanel.view.MainPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.dashpanelmain',
    
    layout: 'border',
    title: 'Real-Time Dashboard Panel',
    
    initComponent: function() {
        var me = this;
        
        // Current vehicle info panel
        me.vehicleInfoPanel = Ext.create('Ext.panel.Panel', {
            region: 'north',
            height: 60,
            title: 'Selected Vehicle',
            html: '<div style="padding: 10px; text-align: center; color: #666;">Select a vehicle from the dashboard panel to view data</div>',
            bodyStyle: 'background: #f5f5f5;'
        });
        
        // Sensor data grid
        me.sensorGrid = Ext.create('Ext.grid.Panel', {
            region: 'center',
            title: 'Live Sensor Data',
            store: Ext.create('Ext.data.Store', {
                fields: [
                    'sensor_name',
                    'sensor_type',
                    'current_value',
                    'unit',
                    'status',
                    'last_update',
                    'min_threshold',
                    'max_threshold'
                ],
                data: []
            }),
            columns: [{
                text: 'Sensor Name',
                dataIndex: 'sensor_name',
                flex: 2,
                renderer: function(value, meta, record) {
                    var iconClass = me.getSensorIcon(record.get('sensor_type'));
                    return '<i class="' + iconClass + '"></i> ' + value;
                }
            }, {
                text: 'Type',
                dataIndex: 'sensor_type',
                width: 100
            }, {
                text: 'Current Value',
                dataIndex: 'current_value',
                width: 120,
                renderer: function(value, meta, record) {
                    var unit = record.get('unit') || '';
                    var status = record.get('status');
                    
                    // Color coding based on status
                    var color = '#000';
                    if (status === 'warning') color = '#ff8c00';
                    else if (status === 'critical') color = '#ff0000';
                    else if (status === 'normal') color = '#008000';
                    
                    // Format value based on sensor type
                    var formattedValue = value;
                    if (typeof value === 'number') {
                        formattedValue = Ext.util.Format.number(value, '0.##');
                    }
                    
                    return '<span style="color: ' + color + '; font-weight: bold;">' + formattedValue + ' ' + unit + '</span>';
                }
            }, {
                text: 'Status',
                dataIndex: 'status',
                width: 80,
                renderer: function(value) {
                    var icon = '';
                    var color = '';
                    
                    switch(value) {
                        case 'normal':
                            icon = 'fa fa-check-circle';
                            color = 'green';
                            break;
                        case 'warning':
                            icon = 'fa fa-exclamation-triangle';
                            color = 'orange';
                            break;
                        case 'critical':
                            icon = 'fa fa-times-circle';
                            color = 'red';
                            break;
                        default:
                            icon = 'fa fa-question-circle';
                            color = 'gray';
                    }
                    
                    return '<i class="' + icon + '" style="color: ' + color + ';"></i> ' + 
                           (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown');
                }
            }, {
                text: 'Thresholds',
                dataIndex: 'min_threshold',
                width: 120,
                renderer: function(value, meta, record) {
                    var min = record.get('min_threshold');
                    var max = record.get('max_threshold');
                    if (min !== null && max !== null) {
                        return min + ' - ' + max;
                    } else if (min !== null) {
                        return 'Min: ' + min;
                    } else if (max !== null) {
                        return 'Max: ' + max;
                    }
                    return '-';
                }
            }, {
                text: 'Last Update',
                dataIndex: 'last_update',
                width: 140,
                renderer: function(value) {
                    if (value) {
                        return Ext.Date.format(new Date(value), 'Y-m-d H:i:s');
                    }
                    return '-';
                }
            }],
            viewConfig: {
                emptyText: 'No sensor data available. Select a vehicle to view sensors.',
                deferEmptyText: false
            }
        });
        
        me.items = [me.vehicleInfoPanel, me.sensorGrid];
        
        me.callParent(arguments);
        
        // Initialize refresh task for real-time updates
        me.refreshTask = null;
        me.currentVehicleId = null;
    },
    
    // Method called from navigation panel when vehicle is selected
    loadVehicleSensors: function(vehicleId, vehicleName) {
        var me = this;
        
        me.currentVehicleId = vehicleId;
        
        // Update vehicle info panel
        me.vehicleInfoPanel.update(
            '<div style="padding: 10px;">' +
            '<h3 style="margin: 0; color: #333;"><i class="fa fa-car"></i> ' + vehicleName + '</h3>' +
            '<span style="color: #666;">Vehicle ID: ' + vehicleId + ' | Real-time dashboard monitoring active</span>' +
            '</div>'
        );
        
        // Start real-time sensor data loading
        me.startSensorDataRefresh();
    },
    
    startSensorDataRefresh: function() {
        var me = this;
        
        // Stop existing refresh task
        if (me.refreshTask) {
            clearInterval(me.refreshTask);
        }
        
        // Load initial data
        me.loadSensorData();
        
        // Set up periodic refresh (every 5 seconds)
        me.refreshTask = setInterval(function() {
            if (me.currentVehicleId) {
                me.loadSensorData();
            }
        }, 5000);
    },
    
    loadSensorData: function() {
        var me = this;
        
        if (!me.currentVehicleId) {
            console.warn('No vehicle ID set, skipping sensor data load');
            return;
        }
        
        console.log('🔄 Loading sensor data for vehicle ID:', me.currentVehicleId);
        
        // Try v3 API first
        me.tryV3API();
    },
    
    tryV3API: function() {
        var me = this;
        
        console.log('Trying PILOT v3 API...');
        
        // Try PILOT v3 API first
        Ext.Ajax.request({
            url: '/api/v3/vehicles/status',
            headers: {
                'Authorization': 'Bearer 010b2ec453be98c07694d807b30861d1'
            },
            params: {
                agent_id: me.currentVehicleId
            },
            success: function(response) {
                console.log('✅ v3 API Success:', response.responseText);
                try {
                    var data = Ext.decode(response.responseText);
                    if (data.code === 0 && data.data && data.data.length > 0) {
                        console.log('Processing real sensor data from v3 API');
                        me.processRealSensorData(data.data[0]);
                    } else {
                        console.warn('v3 API returned no data, trying backend API');
                        me.tryBackendAPI();
                    }
                } catch (e) {
                    console.error('v3 API parse error:', e);
                    me.tryBackendAPI();
                }
            },
            failure: function(response) {
                console.warn('❌ v3 API failed (Status:', response.status, '), trying backend API...');
                me.tryBackendAPI();
            }
        });
    },
    
    tryBackendAPI: function() {
        var me = this;
        
        console.log('Trying backend current_data API...');
        
        // Fallback to backend current data API (no token required)
        // API returns all vehicles, we filter by ID in processBackendSensorData
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                console.log('✅ Backend API Success:', response.responseText);
                try {
                    var data = Ext.decode(response.responseText);
                    me.processBackendSensorData(data);
                } catch (e) {
                    console.error('❌ Backend API parse error:', e, 'Response:', response.responseText);
                    me.showNoDataMessage();
                }
            },
            failure: function(response) {
                console.error('❌ Backend API failed. Status:', response.status, 'Response:', response.responseText);
                me.showNoDataMessage();
            }
        });
    },
    
    showNoDataMessage: function() {
        var me = this;
        
        console.error('💥 All APIs failed - no sensor data available');
        
        // Show empty grid with error message
        me.sensorGrid.getStore().loadData([{
            sensor_name: 'No Data Available',
            sensor_type: 'error',
            current_value: 'All API endpoints failed',
            unit: '',
            status: 'critical',
            last_update: new Date(),
            min_threshold: null,
            max_threshold: null
        }]);
    },
    
    processBackendSensorData: function(data) {
        var me = this;
        var sensorData = [];
        
        console.log('Processing backend API sensor data:', data);
        
        // Backend API returns: {c: 0, objects: [...]}
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            // Find the vehicle by current vehicle ID
            var vehicle = null;
            Ext.each(data.objects, function(obj) {
                if (obj.id == me.currentVehicleId || obj.veh_id == me.currentVehicleId) {
                    vehicle = obj;
                    return false; // break loop
                }
            });
            
            if (!vehicle) {
                console.warn('Vehicle ID', me.currentVehicleId, 'not found in API response');
                me.showNoDataMessage();
                return;
            }
            
            console.log('Found vehicle data:', vehicle);
            
            // Add basic vehicle data
            if (vehicle.last_event && vehicle.last_event.speed !== undefined) {
                sensorData.push({
                    sensor_name: 'Vehicle Speed',
                    sensor_type: 'speed',
                    current_value: vehicle.last_event.speed,
                    unit: 'km/h',
                    status: vehicle.last_event.speed > 80 ? 'warning' : 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000),
                    min_threshold: null,
                    max_threshold: 80
                });
            }
            
            // Add engine status (firing)
            if (vehicle.firing !== undefined) {
                sensorData.push({
                    sensor_name: 'Engine Status',
                    sensor_type: 'engine',
                    current_value: vehicle.firing ? 'ON' : 'OFF',
                    unit: '',
                    status: 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000),
                    min_threshold: null,
                    max_threshold: null
                });
            }
            
            // Add GPS position
            if (vehicle.lat && vehicle.lon) {
                sensorData.push({
                    sensor_name: 'GPS Position',
                    sensor_type: 'location',
                    current_value: parseFloat(vehicle.lat).toFixed(6) + ', ' + parseFloat(vehicle.lon).toFixed(6),
                    unit: 'lat,lon',
                    status: 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000),
                    min_threshold: null,
                    max_threshold: null
                });
            }
            
            // Process sensors object - format: "sensorName": "4 %|timestamp|id|value|source|raw|flag|type"
            if (vehicle.sensors && typeof vehicle.sensors === 'object') {
                Ext.Object.each(vehicle.sensors, function(sensorName, sensorData) {
                    // Parse pipe-separated sensor string: "4 %|1769491575|1539853|4|Auto Can|4|1|3"
                    var parts = sensorData.split('|');
                    if (parts.length >= 4) {
                        var humanValue = parts[0]; // "4 %"
                        var timestamp = parseInt(parts[1]); // 1769491575
                        var digitalValue = parseFloat(parts[3]); // 4
                        
                        var sensorType = me.determineSensorType(sensorName);
                        var status = me.calculateSensorStatusFromValue(digitalValue, sensorType);
                        var unit = me.extractUnit(humanValue);
                        
                        sensorData.push({
                            sensor_name: sensorName,
                            sensor_type: sensorType,
                            current_value: digitalValue,
                            unit: unit,
                            status: status,
                            last_update: new Date(timestamp * 1000),
                            min_threshold: null,
                            max_threshold: null,
                            raw_value: parts[5] || '',
                            human_value: humanValue
                        });
                    }
                });
            }
        }
        
        if (sensorData.length === 0) {
            console.warn('No sensor data found for vehicle ID:', me.currentVehicleId);
            me.showNoDataMessage();
            return;
        }
        
        console.log('✅ Successfully loaded real sensor data from backend. Count:', sensorData.length);
        me.sensorGrid.getStore().loadData(sensorData);
    },
    
    // Helper to format sensor names from API keys
    formatSensorName: function(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    },
    
    // Helper to get appropriate units for sensor types
    getSensorUnit: function(key, sensorType) {
        var keyLower = key.toLowerCase();
        
        if (keyLower.includes('temp')) return '°C';
        if (keyLower.includes('voltage') || keyLower.includes('volt')) return 'V';
        if (keyLower.includes('pressure')) return 'PSI';
        if (keyLower.includes('fuel') || keyLower.includes('level')) return '%';
        if (keyLower.includes('speed')) return 'km/h';
        if (keyLower.includes('weight') || keyLower.includes('load')) return 'kg';
        
        switch (sensorType) {
            case 'temperature': return '°C';
            case 'voltage': return 'V';
            case 'pressure': return 'PSI';
            case 'level': return '%';
            case 'speed': return 'km/h';
            case 'weight': return 'kg';
            default: return '';
        }
    },
    
    processRealSensorData: function(vehicleData) {
        var me = this;
        var sensorData = [];
        
        // Process real sensor data from PILOT v3 API response
        if (vehicleData && Ext.isArray(vehicleData.sensors)) {
            Ext.each(vehicleData.sensors, function(sensor) {
                // Determine sensor type from name or use generic
                var sensorType = me.determineSensorType(sensor.name);
                
                // Calculate status based on sensor value patterns (since API doesn't provide thresholds)
                var status = me.calculateSensorStatusFromValue(sensor.dig_value, sensorType);
                
                sensorData.push({
                    sensor_name: sensor.name || 'Unknown Sensor',
                    sensor_type: sensorType,
                    current_value: sensor.dig_value,
                    unit: me.extractUnit(sensor.hum_value),
                    status: status,
                    last_update: new Date(sensor.change_ts * 1000), // Convert from unix timestamp
                    min_threshold: null, // API doesn't provide thresholds
                    max_threshold: null,
                    raw_value: sensor.raw_value,
                    sensor_id: sensor.id
                });
            });
        }
        
        // Also add vehicle status as sensors
        if (vehicleData) {
            // Add speed as a sensor
            if (vehicleData.speed !== undefined) {
                sensorData.push({
                    sensor_name: 'Vehicle Speed',
                    sensor_type: 'speed',
                    current_value: vehicleData.speed,
                    unit: 'km/h',
                    status: vehicleData.speed > 80 ? 'warning' : 'normal',
                    last_update: new Date(vehicleData.unixtimestamp * 1000),
                    min_threshold: null,
                    max_threshold: 80
                });
            }
            
            // Add engine status
            if (vehicleData.firing !== undefined) {
                sensorData.push({
                    sensor_name: 'Engine Status',
                    sensor_type: 'engine',
                    current_value: vehicleData.firing,
                    unit: vehicleData.firing ? 'ON' : 'OFF',
                    status: 'normal',
                    last_update: new Date(vehicleData.unixtimestamp * 1000),
                    min_threshold: null,
                    max_threshold: null
                });
            }
        }
        
        console.log('Successfully loaded real sensor data. Count:', sensorData.length);
        me.sensorGrid.getStore().loadData(sensorData);
    },
    
    // Helper method to determine sensor type from name
    determineSensorType: function(sensorName) {
        if (!sensorName) return 'generic';
        
        var name = sensorName.toLowerCase();
        if (name.includes('температур') || name.includes('temp')) return 'temperature';
        if (name.includes('давлен') || name.includes('pressure')) return 'pressure';
        if (name.includes('топлив') || name.includes('fuel') || name.includes('уровень')) return 'level';
        if (name.includes('напряж') || name.includes('voltage') || name.includes('вольт')) return 'voltage';
        if (name.includes('скорост') || name.includes('speed')) return 'speed';
        if (name.includes('нагрузк') || name.includes('вес') || name.includes('load') || name.includes('weight')) return 'weight';
        
        return 'generic';
    },
    
    // Helper method to extract unit from human readable value
    extractUnit: function(humValue) {
        if (!humValue) return '';
        
        // Extract unit from strings like "14356 кг" or "25.5 V"
        var matches = humValue.toString().match(/([a-zA-Zа-яА-Я°%]+)$/);
        return matches ? matches[1] : '';
    },
    
    // Calculate status from sensor value based on type
    calculateSensorStatusFromValue: function(value, sensorType) {
        if (value === null || value === undefined) return 'unknown';
        
        // Basic heuristics for different sensor types
        switch (sensorType) {
            case 'temperature':
                if (value > 100 || value < -20) return 'critical';
                if (value > 80 || value < 0) return 'warning';
                return 'normal';
                
            case 'voltage':
                if (value > 15 || value < 10) return 'critical';
                if (value > 14 || value < 11) return 'warning';
                return 'normal';
                
            case 'pressure':
                if (value > 100 || value < 0) return 'critical';
                if (value > 80 || value < 10) return 'warning';
                return 'normal';
                
            case 'level':
                if (value < 5) return 'critical';
                if (value < 15) return 'warning';
                return 'normal';
                
            default:
                return 'normal';
        }
    },
    
    getSensorIcon: function(sensorType) {
        switch(sensorType) {
            case 'temperature': return 'fa fa-thermometer-half';
            case 'pressure': return 'fa fa-tachometer-alt';
            case 'level': return 'fa fa-battery-half';
            case 'voltage': return 'fa fa-bolt';
            case 'speed': return 'fa fa-speedometer';
            default: return 'fa fa-sensor';
        }
    },
    
    // Cleanup when panel is destroyed
    onDestroy: function() {
        var me = this;
        
        if (me.refreshTask) {
            clearInterval(me.refreshTask);
            me.refreshTask = null;
        }
        
        me.callParent(arguments);
    }
});
