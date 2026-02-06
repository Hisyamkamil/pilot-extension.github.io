Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V2 (Auto-Load Permanent Panel) extension initializing...');
        
        // Store reference for later use
        window.dashpanelModule = me;
        
        // Create permanent panel immediately and auto-load ALL vehicle sensors
        Ext.defer(function() {
            me.createPermanentSensorPanel();
        }, 1000); // Wait 1 second after login
    },
    
    createPermanentSensorPanel: function() {
        var me = this;
        
        // Check if panel already exists
        var existingPanel = Ext.getCmp('dashpanel-permanent-overlay');
        if (existingPanel) {
            console.log('Permanent panel already exists');
            return;
        }
        
        console.log('📊 Creating permanent fixed sensor panel...');
        
        // Create permanent fixed sensor panel (bottom of screen)
        var permanentPanel = Ext.create('Ext.panel.Panel', {
            id: 'dashpanel-permanent-overlay',
            title: '🔧 Dashboard Panel - Real-time Sensors (All Vehicles)',
            width: '100%',
            height: 350,
            collapsible: true,
            collapsed: true,  // Start collapsed, will auto-expand when data loads
            resizable: false,
            draggable: false,
            closable: false,  // Cannot close, only collapse
            layout: 'fit',
            
            // Fixed position at bottom of viewport
            style: {
                position: 'fixed',
                bottom: '0px',
                left: '0px',
                right: '0px',
                'z-index': '1000',
                'box-shadow': '0 -2px 10px rgba(0,0,0,0.3)',
                'background-color': 'white',
                'border-top': '2px solid #007bff'
            },
            
            items: [{
                xtype: 'grid',
                store: Ext.create('Ext.data.Store', {
                    fields: ['sensor_name', 'sensor_type', 'current_value', 'unit', 'status', 'last_update'],
                    data: []
                }),
                columns: [{
                    text: 'Sensor Name',
                    dataIndex: 'sensor_name',
                    flex: 3,
                    renderer: function(value, meta, record) {
                        var iconClass = me.getSensorIcon(record.get('sensor_type'));
                        return '<i class="' + iconClass + '"></i> ' + value;
                    }
                }, {
                    text: 'Value',
                    dataIndex: 'current_value',
                    width: 120,
                    renderer: function(value, meta, record) {
                        var unit = record.get('unit') || '';
                        var status = record.get('status');
                        
                        // Color coding
                        var color = status === 'critical' ? '#ff0000' : 
                                   status === 'warning' ? '#ff8c00' : '#008000';
                        
                        var formattedValue = typeof value === 'number' ? 
                                           Ext.util.Format.number(value, '0.##') : value;
                        
                        return '<span style="color: ' + color + '; font-weight: bold;">' + formattedValue + ' ' + unit + '</span>';
                    }
                }, {
                    text: 'Status',
                    dataIndex: 'status',
                    width: 80,
                    renderer: function(value) {
                        var icon = value === 'critical' ? 'fa fa-times-circle' :
                                  value === 'warning' ? 'fa fa-exclamation-triangle' : 'fa fa-check-circle';
                        var color = value === 'critical' ? 'red' : 
                                   value === 'warning' ? 'orange' : 'green';
                        return '<i class="' + icon + '" style="color: ' + color + ';"></i>';
                    }
                }, {
                    text: 'Last Update',
                    dataIndex: 'last_update',
                    width: 120,
                    renderer: function(value) {
                        return value ? Ext.Date.format(new Date(value), 'H:i:s') : '-';
                    }
                }],
                viewConfig: {
                    emptyText: 'Auto-loading sensor data from all vehicles...',
                    deferEmptyText: false
                }
            }],
            
            tbar: [{
    
    loadAllVehicleSensors: function() {
        var me = this;
        
        console.log('🚀 Auto-loading sensor data from ALL vehicles (no clicks needed)...');
        
        Ext.Ajax.request({
            url: '/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processAllVehicleSensors(data);
                } catch (e) {
                    console.error('❌ API parse error:', e);
                    me.tryExternalAPIForAll();
                }
            },
            failure: function() {
                console.warn('❌ Backend API failed, trying external...');
                me.tryExternalAPIForAll();
            }
        });
    },
    
    tryExternalAPIForAll: function() {
        var me = this;
        
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processAllVehicleSensors(data);
                } catch (e) {
                    console.error('❌ External API parse error:', e);
                    me.showNoSensorData();
                }
            },
            failure: function() {
                console.error('❌ External API failed');
                me.showNoSensorData();
            }
        });
    },
    
    processAllVehicleSensors: function(data) {
        var me = this;
        var allSensors = [];
        
        console.log('🔄 Auto-processing sensors from ALL vehicles...');
        
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            Ext.each(data.objects, function(vehicle) {
                if (vehicle.sensors && typeof vehicle.sensors === 'object') {
                    console.log('Processing vehicle:', vehicle.name || vehicle.id, 'with', Object.keys(vehicle.sensors).length, 'sensors');
                    
                    // Add basic vehicle status
                    allSensors.push({
                        sensor_name: '🚗 ' + (vehicle.name || 'Vehicle ' + vehicle.id) + ' - Speed',
                        sensor_type: 'speed',
                        current_value: vehicle.last_event ? vehicle.last_event.speed || 0 : 0,
                        unit: 'km/h',
                        status: 'normal',
                        last_update: new Date(vehicle.unixtimestamp * 1000)
                    });
                    
                    allSensors.push({
                        sensor_name: '🚗 ' + (vehicle.name || 'Vehicle ' + vehicle.id) + ' - Engine',
                        sensor_type: 'engine',
                        current_value: vehicle.firing ? 'ON' : 'OFF',
                        unit: '',
                        status: 'normal',
                        last_update: new Date(vehicle.unixtimestamp * 1000)
                    });
                    
                    // Add all individual sensors from this vehicle
                    Ext.Object.each(vehicle.sensors, function(sensorName, sensorValue) {
                        var parts = sensorValue.split('|');
                        if (parts.length >= 4) {
                            allSensors.push({
                                sensor_name: (vehicle.name || 'V' + vehicle.id) + ' - ' + sensorName,
                                sensor_type: me.determineSensorType(sensorName),
                                current_value: parseFloat(parts[3]),
                                unit: me.extractUnit(parts[0]),
                                status: me.calculateSensorStatus(parseFloat(parts[3]), me.determineSensorType(sensorName)),
                                last_update: new Date(parseInt(parts[1]) * 1000)
                            });
                        }
                    });
                }
            });
        }
        
        console.log('✅ Auto-processed', allSensors.length, 'sensors from', data.objects ? data.objects.length : 0, 'vehicles');
        
        if (me.permanentPanel) {
            var grid = me.permanentPanel.down('grid');
            if (grid) {
                grid.getStore().loadData(allSensors);
                
                // Auto-expand panel when sensors load
                if (me.permanentPanel.collapsed && allSensors.length > 0) {
                    me.permanentPanel.expand();
                    console.log('📂 Auto-expanded panel showing', allSensors.length, 'sensors from all vehicles');
                }
            }
        }
    },
    
    startAutoRefreshAllVehicles: function() {
        var me = this;
        
        me.stopAutoRefreshAllVehicles();
        
        // Auto-refresh ALL vehicles every 0.5 seconds
        me.autoRefreshTask = setInterval(function() {
            me.loadAllVehicleSensors();
        }, 500);
        
        console.log('🔄 Auto-refresh started for ALL vehicles (0.5s) - no clicks needed');
    },
    
    stopAutoRefreshAllVehicles: function() {
        var me = this;
        
        if (me.autoRefreshTask) {
            clearInterval(me.autoRefreshTask);
            me.autoRefreshTask = null;
        }
    },
    
    showNoSensorData: function() {
        var me = this;
        
        if (me.permanentPanel) {
            var grid = me.permanentPanel.down('grid');
            if (grid) {
                grid.getStore().loadData([{
                    sensor_name: 'No Data Available',
                    sensor_type: 'error', 
                    current_value: 'Unable to load sensors from any vehicle',
                    unit: '',
                    status: 'critical',
                    last_update: new Date()
                }]);
            }
        }
    },
                text: 'Refresh All',
                iconCls: 'fa fa-refresh',
                handler: function() {
                    me.loadAllVehicleSensors();
                }
            }, '->', {
                xtype: 'tbtext',
                text: 'Real-time (0.5s) | All vehicles auto-loaded',
                style: 'color: #666; font-size: 11px;'
            }],
            
            listeners: {
                afterrender: function() {
                    console.log('🚀 Permanent panel rendered, starting auto-load...');
                    
                    // Auto-load ALL vehicle sensors immediately (no clicking required)
                    Ext.defer(function() {
                        me.loadAllVehicleSensors();
                        me.startAutoRefreshAllVehicles();
                    }, 2000); // 2 seconds after panel render
                },
                collapse: function() {
                    console.log('📦 Permanent panel collapsed - map fully visible');
                },
                expand: function() {
                    console.log('📂 Permanent panel expanded - showing all vehicle sensors');
                }
            }
        });
        
        // Render to document body (fixed position overlay)
        permanentPanel.render(Ext.getBody());
        console.log('✅ Permanent sensor panel created (auto-loads all vehicles)');
        
        // Store reference
        me.permanentPanel = permanentPanel;
    },
    
    loadAllVehicleSensors: function() {
        var me = this;
        
        console.log('🚀 Loading sensor data from ALL vehicles automatically...');
        
        Ext.Ajax.request({
            url: '/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processAllVehicleSensors(data);
                } catch (e) {
                    console.error('❌ API parse error:', e);
                    me.tryExternalAPIForAll();
                }
            },
            failure: function() {
                console.warn('❌ Backend API failed, trying external...');
                me.tryExternalAPIForAll();
            }
        });
    },
    
    tryExternalAPIForAll: function() {
        var me = this;
        
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processAllVehicleSensors(data);
                } catch (e) {
                    console.error('❌ External API parse error:', e);
                    me.showNoSensorData();
                }
            },
            failure: function() {
                console.error('❌ External API failed');
                me.showNoSensorData();
            }
        });
    },
    
    processAllVehicleSensors: function(data) {
        var me = this;
        var allSensors = [];
        
        console.log('🔄 Processing sensors from ALL vehicles automatically...');
        
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            Ext.each(data.objects, function(vehicle) {
                if (vehicle.sensors && typeof vehicle.sensors === 'object') {
                    console.log('Auto-processing sensors for vehicle:', vehicle.name || vehicle.id);
                    
                    // Add basic vehicle info first
                    allSensors.push({
                        sensor_name: '🚗 ' + (vehicle.name || 'Vehicle ' + vehicle.id) + ' - Speed',
                        sensor_type: 'speed',
                        current_value: vehicle.last_event ? vehicle.last_event.speed || 0 : 0,
                        unit: 'km/h',
                        status: 'normal',
                        last_update: new Date(vehicle.unixtimestamp * 1000)
                    });
                    
                    // Add engine status
                    allSensors.push({
                        sensor_name: '🚗 ' + (vehicle.name || 'Vehicle ' + vehicle.id) + ' - Engine',
                        sensor_type: 'engine',
                        current_value: vehicle.firing ? 'ON' : 'OFF',
                        unit: '',
                        status: 'normal',
                        last_update: new Date(vehicle.unixtimestamp * 1000)
                    });
                    
                    // Add all individual sensors from this vehicle
                    Ext.Object.each(vehicle.sensors, function(sensorName, sensorValue) {
                        var parts = sensorValue.split('|');
                        if (parts.length >= 4) {
                            allSensors.push({
                                sensor_name: (vehicle.name || 'V' + vehicle.id) + ' - ' + sensorName,
                                sensor_type: me.determineSensorType(sensorName),
                                current_value: parseFloat(parts[3]),
                                unit: me.extractUnit(parts[0]),
                                status: me.calculateSensorStatus(parseFloat(parts[3]), me.determineSensorType(sensorName)),
                                last_update: new Date(parseInt(parts[1]) * 1000)
                            });
                        }
                    });
                }
            });
        }
        
        console.log('✅ Auto-processed', allSensors.length, 'sensors from', data.objects ? data.objects.length : 0, 'vehicles');
        
        if (me.permanentPanel) {
            var grid = me.permanentPanel.down('grid');
            if (grid) {
                grid.getStore().loadData(allSensors);
                
                // Auto-expand panel to show all sensor data
                if (me.permanentPanel.collapsed && allSensors.length > 0) {
                    me.permanentPanel.expand();
                    console.log('📂 Auto-expanded permanent panel with', allSensors.length, 'sensors from all vehicles');
                }
            }
        }
    },
    
    startAutoRefreshAllVehicles: function() {
        var me = this;
        
        // Stop existing refresh
        me.stopAutoRefreshAllVehicles();
        
        // Start auto-refresh for ALL vehicles (0.5s)
        me.autoRefreshTask = setInterval(function() {
            me.loadAllVehicleSensors();
        }, 500);
        
        console.log('🔄 Auto-refresh started for ALL vehicles (0.5s intervals)');
    },
    
    stopAutoRefreshAllVehicles: function() {
        var me = this;
        
        if (me.autoRefreshTask) {
            clearInterval(me.autoRefreshTask);
            me.autoRefreshTask = null;
            console.log('Auto-refresh stopped');
        }
    },
    
    showNoSensorData: function() {
        var me = this;
        
        if (me.permanentPanel) {
            var grid = me.permanentPanel.down('grid');
            if (grid) {
                grid.getStore().loadData([{
                    sensor_name: 'No Data Available',
                    sensor_type: 'error',
                    current_value: 'Unable to load sensor data from any vehicle',
                    unit: '',
                    status: 'critical',
                    last_update: new Date()
                }]);
            }
        }
    },
    
    loadAllVehicleSensors: function() {
        var me = this;
        
        console.log('🚀 Loading sensor data from ALL vehicles automatically...');
        
        Ext.Ajax.request({
            url: '/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processAllVehicleSensors(data);
                } catch (e) {
                    console.error('❌ API parse error:', e);
                    me.tryExternalAPIForAll();
                }
            },
            failure: function() {
                console.warn('❌ Backend API failed, trying external...');
                me.tryExternalAPIForAll();
            }
        });
    },
    
    tryExternalAPIForAll: function() {
        var me = this;
        
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processAllVehicleSensors(data);
                } catch (e) {
                    console.error('❌ External API parse error:', e);
                    me.showNoSensorData();
                }
            },
            failure: function() {
                console.error('❌ External API failed');
                me.showNoSensorData();
            }
        });
    },
    
    processAllVehicleSensors: function(data) {
        var me = this;
        var allSensors = [];
        
        console.log('🔄 Processing sensors from ALL vehicles automatically...');
        
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            Ext.each(data.objects, function(vehicle) {
                if (vehicle.sensors && typeof vehicle.sensors === 'object') {
                    console.log('Auto-processing sensors for vehicle:', vehicle.name || vehicle.id);
                    
                    // Add basic vehicle info first
                    allSensors.push({
                        sensor_name: '🚗 ' + (vehicle.name || 'Vehicle ' + vehicle.id) + ' - Speed',
                        sensor_type: 'speed',
                        current_value: vehicle.last_event ? vehicle.last_event.speed || 0 : 0,
                        unit: 'km/h',
                        status: 'normal',
                        last_update: new Date(vehicle.unixtimestamp * 1000)
                    });
                    
                    // Add engine status
                    allSensors.push({
                        sensor_name: '🚗 ' + (vehicle.name || 'Vehicle ' + vehicle.id) + ' - Engine',
                        sensor_type: 'engine',
                        current_value: vehicle.firing ? 'ON' : 'OFF',
                        unit: '',
                        status: 'normal',
                        last_update: new Date(vehicle.unixtimestamp * 1000)
                    });
                    
                    // Add all individual sensors from this vehicle
                    Ext.Object.each(vehicle.sensors, function(sensorName, sensorValue) {
                        var parts = sensorValue.split('|');
                        if (parts.length >= 4) {
                            allSensors.push({
                                sensor_name: (vehicle.name || 'V' + vehicle.id) + ' - ' + sensorName,
                                sensor_type: me.determineSensorType(sensorName),
                                current_value: parseFloat(parts[3]),
                                unit: me.extractUnit(parts[0]),
                                status: me.calculateSensorStatus(parseFloat(parts[3]), me.determineSensorType(sensorName)),
                                last_update: new Date(parseInt(parts[1]) * 1000)
                            });
                        }
                    });
                }
            });
        }
        
        console.log('✅ Auto-processed', allSensors.length, 'sensors from', data.objects ? data.objects.length : 0, 'vehicles');
        
        if (me.permanentPanel) {
            var grid = me.permanentPanel.down('grid');
            if (grid) {
                grid.getStore().loadData(allSensors);
                
                // Auto-expand panel to show all sensor data
                if (me.permanentPanel.collapsed && allSensors.length > 0) {
                    me.permanentPanel.expand();
                    console.log('📂 Auto-expanded permanent panel with', allSensors.length, 'sensors from all vehicles');
                }
            }
        }
    },
    
    startAutoRefreshAllVehicles: function() {
        var me = this;
        
        // Stop existing refresh
        me.stopAutoRefreshAllVehicles();
        
        // Start auto-refresh for ALL vehicles (0.5s)
        me.autoRefreshTask = setInterval(function() {
            me.loadAllVehicleSensors();
        }, 500);
        
        console.log('🔄 Auto-refresh started for ALL vehicles (0.5s intervals)');
    },
    
    stopAutoRefreshAllVehicles: function() {
        var me = this;
        
        if (me.autoRefreshTask) {
            clearInterval(me.autoRefreshTask);
            me.autoRefreshTask = null;
            console.log('Auto-refresh stopped');
        }
    },
    
    showNoSensorData: function() {
        var me = this;
        
        if (me.permanentPanel) {
            var grid = me.permanentPanel.down('grid');
            if (grid) {
                grid.getStore().loadData([{
                    sensor_name: 'No Data Available',
                    sensor_type: 'error',
                    current_value: 'Unable to load sensor data from any vehicle',
                    unit: '',
                    status: 'critical',
                    last_update: new Date()
                }]);
            }
        }
    },
    
    // Helper methods
    determineSensorType: function(name) {
        if (!name) return 'generic';
        var n = name.toLowerCase();
        if (n.includes('temp')) return 'temperature';
        if (n.includes('fuel') || n.includes('level')) return 'level';
        if (n.includes('voltage')) return 'voltage';
        if (n.includes('pressure')) return 'pressure';
        if (n.includes('speed')) return 'speed';
        if (n.includes('engine')) return 'engine';
        return 'generic';
    },
    
    extractUnit: function(humValue) {
        if (!humValue) return '';
        var matches = humValue.toString().match(/([a-zA-Z°%]+)$/);
        return matches ? matches[1] : '';
    },
    
    calculateSensorStatus: function(value, sensorType) {
        if (value === null || value === undefined) return 'normal';
        
        switch (sensorType) {
            case 'temperature':
                if (value > 100 || value < -20) return 'critical';
                if (value > 80 || value < 0) return 'warning';
                return 'normal';
            case 'voltage':
                if (value > 15 || value < 10) return 'critical';
                if (value > 14 || value < 11) return 'warning';
                return 'normal';
            case 'level':
                if (value < 5) return 'critical';
                if (value < 15) return 'warning';
                return 'normal';
            default:
                return 'normal';
        }
    },
    
    getSensorIcon: function(type) {
        switch(type) {
            case 'temperature': return 'fa fa-thermometer-half';
            case 'level': return 'fa fa-battery-half';
            case 'voltage': return 'fa fa-bolt';
            case 'pressure': return 'fa fa-tachometer-alt';
            case 'speed': return 'fa fa-speedometer';
            case 'engine': return 'fa fa-cog';
            default: return 'fa fa-microchip';
        }
    }
});
