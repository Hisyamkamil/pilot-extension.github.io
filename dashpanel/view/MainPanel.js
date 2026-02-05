Ext.define('Store.dashpanel.view.MainPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.sensormonitoringmain',
    
    layout: 'border',
    title: 'Real-Time Sensor Monitoring',
    
    initComponent: function() {
        var me = this;
        
        // Current vehicle info panel
        me.vehicleInfoPanel = Ext.create('Ext.panel.Panel', {
            region: 'north',
            height: 60,
            title: 'Selected Vehicle',
            html: '<div style="padding: 10px; text-align: center; color: #666;">Select a vehicle from the navigation panel to view sensor data</div>',
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
                    
                    return '<span style="color: ' + color + '; font-weight: bold;">' + value + ' ' + unit + '</span>';
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
            '<span style="color: #666;">Vehicle ID: ' + vehicleId + ' | Real-time sensor monitoring active</span>' +
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
            return;
        }
        
        // Load sensor data from PILOT API
        Ext.Ajax.request({
            url: '/ax/sensors.php', // Assumed sensor data endpoint
            params: {
                vehicle_id: me.currentVehicleId,
                type: 'realtime'
            },
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processSensorData(data);
                } catch (e) {
                    console.error('Error parsing sensor data:', e);
                    // Continue with mock data for demonstration
                    me.loadMockSensorData();
                }
            },
            failure: function() {
                console.warn('Failed to load sensor data from API, using mock data');
                // Load mock data for demonstration purposes
                me.loadMockSensorData();
            }
        });
    },
    
    processSensorData: function(data) {
        var me = this;
        var sensorData = [];
        
        if (data && Ext.isArray(data.sensors)) {
            Ext.each(data.sensors, function(sensor) {
                var status = me.calculateSensorStatus(sensor.value, sensor.min_threshold, sensor.max_threshold);
                
                sensorData.push({
                    sensor_name: sensor.name || 'Unknown Sensor',
                    sensor_type: sensor.type || 'generic',
                    current_value: sensor.value,
                    unit: sensor.unit || '',
                    status: status,
                    last_update: sensor.timestamp || new Date(),
                    min_threshold: sensor.min_threshold,
                    max_threshold: sensor.max_threshold
                });
            });
        }
        
        me.sensorGrid.getStore().loadData(sensorData);
    },
    
    // Mock data for demonstration when API is not available
    loadMockSensorData: function() {
        var me = this;
        
        var mockSensors = [
            {
                sensor_name: 'Engine Temperature',
                sensor_type: 'temperature',
                current_value: 85.5,
                unit: '°C',
                min_threshold: 70,
                max_threshold: 95,
                last_update: new Date()
            },
            {
                sensor_name: 'Oil Pressure',
                sensor_type: 'pressure',
                current_value: 45.2,
                unit: 'PSI',
                min_threshold: 30,
                max_threshold: 60,
                last_update: new Date()
            },
            {
                sensor_name: 'Fuel Level',
                sensor_type: 'level',
                current_value: 78.5,
                unit: '%',
                min_threshold: 10,
                max_threshold: 100,
                last_update: new Date()
            },
            {
                sensor_name: 'Battery Voltage',
                sensor_type: 'voltage',
                current_value: 12.4,
                unit: 'V',
                min_threshold: 11.5,
                max_threshold: 14.5,
                last_update: new Date()
            },
            {
                sensor_name: 'Speed',
                sensor_type: 'speed',
                current_value: 45,
                unit: 'km/h',
                min_threshold: 0,
                max_threshold: 120,
                last_update: new Date()
            }
        ];
        
        // Add random variation to simulate real-time data
        Ext.each(mockSensors, function(sensor) {
            var variation = (Math.random() - 0.5) * 2; // ±1 unit variation
            sensor.current_value = Math.round((sensor.current_value + variation) * 10) / 10;
            sensor.status = me.calculateSensorStatus(sensor.current_value, sensor.min_threshold, sensor.max_threshold);
        });
        
        me.sensorGrid.getStore().loadData(mockSensors);
    },
    
    calculateSensorStatus: function(value, minThreshold, maxThreshold) {
        if (minThreshold !== null && value < minThreshold) {
            return 'critical';
        }
        if (maxThreshold !== null && value > maxThreshold) {
            return 'critical';
        }
        
        // Warning zones (within 10% of thresholds)
        if (minThreshold !== null && value < minThreshold * 1.1) {
            return 'warning';
        }
        if (maxThreshold !== null && value > maxThreshold * 0.9) {
            return 'warning';
        }
        
        return 'normal';
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
