Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V2 (Template Pattern) extension initializing...');
        
        // Store reference for later use
        window.dashpanelModule = me;
        
        // Add sub-panel to existing Online navigation (NOT new top tab)
        me.addSubPanelToOnlineNavigation();
        
        // Create background sensor panel (behind navigation)
        Ext.defer(function() {
            me.createBackgroundSensorPanel();
        }, 1000);

        console.log('✅ V2 sub-panel added to existing Online navigation');
    },
    
    addSubPanelToOnlineNavigation: function() {
        var me = this;
        
        // Access existing Online navigation panel (LEFT side)
        if (skeleton && skeleton.navigation && skeleton.navigation.online) {
            var onlinePanel = skeleton.navigation.online;
            
            console.log('Found existing Online panel, adding Dashboard sub-panel...');
            
            // Create vehicle tree sub-panel UNDER existing Online tree
            var dashboardSubPanel = Ext.create('Store.dashpanel.view.Navigation', {
                title: 'Sensor Monitor',
                iconCls: 'fa fa-tachometer-alt',
                height: 300,
                collapsible: true,
                split: true
            });
            
            // Add sub-panel to existing Online navigation (LEFT panel, not top)
            if (onlinePanel.add) {
                onlinePanel.add(dashboardSubPanel);
                console.log('✅ Dashboard sub-panel added UNDER Online tree (left panel)');
                
                // Listen for tab selection to show/hide docked panel with enhanced debugging
                if (onlinePanel.on) {
                    console.log('🔍 Setting up tabchange listener on Online panel');
                    onlinePanel.on('tabchange', function(tabPanel, newCard, oldCard) {
                        console.log('🔍 Tab changed from:', oldCard ? oldCard.title : 'none', 'to:', newCard ? newCard.title : 'none');
                        console.log('🔍 backgroundPanel available:', !!me.backgroundPanel);
                        
                        if (newCard && newCard.title === 'Sensor Monitor' && me.backgroundPanel) {
                            console.log('🔧 Sensor Monitor tab selected - showing docked panel');
                            me.backgroundPanel.setHidden(false);
                            me.backgroundPanel.show();
                            console.log('✅ Docked panel should now be visible');
                        } else if (me.backgroundPanel && !me.backgroundPanel.hidden) {
                            console.log('🔧 Other tab selected - hiding docked panel');
                            me.backgroundPanel.setHidden(true);
                            me.backgroundPanel.hide();
                            console.log('✅ Docked panel hidden');
                        }
                    });
                    
                    // Also listen for when the sub-panel itself becomes active
                    dashboardSubPanel.on('activate', function() {
                        console.log('🔧 Dashboard sub-panel activated directly');
                        if (me.backgroundPanel) {
                            me.backgroundPanel.setHidden(false);
                            me.backgroundPanel.show();
                            console.log('✅ Docked panel shown via sub-panel activation');
                        }
                    });
                    
                    dashboardSubPanel.on('deactivate', function() {
                        console.log('🔧 Dashboard sub-panel deactivated');
                        if (me.backgroundPanel) {
                            me.backgroundPanel.setHidden(true);
                            me.backgroundPanel.hide();
                            console.log('✅ Docked panel hidden via sub-panel deactivation');
                        }
                    });
                } else {
                    console.warn('❌ Cannot listen for tab events on Online panel');
                }
            } else {
                console.error('❌ Cannot add sub-panel to Online navigation');
            }
            
        } else {
            console.error('❌ Online navigation not available');
        }
    },
    
    createBackgroundSensorPanel: function() {
        var me = this;
        
        console.log('📊 Creating docked sensor panel (within mapframe)...');
        
        // Create sensor panel to dock within mapframe (like reference pattern)
        var dockedSensorPanel = Ext.create('Ext.panel.Panel', {
            title: '🔧 Sensor Monitor - Sensor Data',
            height: 325,
        
            region: 'south',
            split: true,
            collapsible: true,
            collapseMode: 'mini',
            animCollapse: true,
            titleCollapse: true,
        
            hidden: true,
            layout: 'fit',
            id: 'dashpanel-sensor-panel',
        
            // ────────────────────────────────
            // LEFT-SIDE TOOL BUTTON FIX
            // ────────────────────────────────
            header: {
                layout: {
                    pack: 'start',
                    align: 'middle'
                },
                items: [{
                    xtype: 'tool',
                    itemId: 'leftCollapseTool',
                    type: 'down',        // starts expanded
                    margin: '0 8 0 0',
                    callback: function(panel){
                        panel.collapsed ? panel.expand() : panel.collapse();
                    }
                }]
            },
        
            listeners: {
                collapse: function(panel) {
                    panel.down('#leftCollapseTool').setType('up');
                },
                expand: function(panel) {
                    panel.down('#leftCollapseTool').setType('down');
                }
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
                    flex: 2,
                    renderer: function(value, meta, record) {
                        var icon = me.getSensorIcon(record.get('sensor_type'));
                        return '<i class="' + icon + '"></i> ' + value;
                    },
                    scope: me     // important fix
                }, {
                    text: 'Value',
                    dataIndex: 'current_value',
                    width: 120,
                    renderer: function(value, meta, record) {
                        var unit = record.get('unit') || '';
                        var status = record.get('status');
        
                        var color = status === 'critical' ? '#ff0000' :
                                    status === 'warning' ? '#ff8c00' : '#008000';
        
                        var formattedValue = typeof value === 'number'
                            ? Ext.util.Format.number(value, '0.##')
                            : value;
        
                        return '<span style="color:' + color + '; font-weight:bold;">' +
                               formattedValue + ' ' + unit +
                               '</span>';
                    }
                }, {
                    text: 'Status',
                    dataIndex: 'status',
                    width: 80,
                    renderer: function(value) {
                        var icon = value === 'critical' ? 'fa fa-times-circle' :
                                   value === 'warning' ? 'fa fa-exclamation-triangle' :
                                                         'fa fa-check-circle';
                        var color = value === 'critical' ? 'red' :
                                   value === 'warning' ? 'orange' : 'green';
                        return '<i class="' + icon + '" style="color:' + color + '"></i>';
                    }
                }, {
                    text: 'Last Update',
                    dataIndex: 'last_update',
                    width: 120,
                    renderer: function(value) {
                        return value
                            ? Ext.Date.format(new Date(value), 'H:i:s')
                            : '-';
                    }
                }],
        
                viewConfig: {
                    emptyText: 'Select a vehicle from Sensor Monitor navigation to view sensors',
                    deferEmptyText: false
                }
            }]
        });

        
        // Add docked panel to mapframe (like reference pattern - BOTTOM placement)
        try {
            if (skeleton && skeleton.mapframe) {
                console.log('🔍 mapframe type:', skeleton.mapframe.$className);
                console.log('🔍 mapframe layout:', skeleton.mapframe.layout);
                console.log('🔍 mapframe methods:', Object.keys(skeleton.mapframe).slice(0, 15));
                
                // Find the main map panel to dock to its bottom
                var mapFramePanel = skeleton.mapframe.down('panel'); // First panel in mapframe
                
                if (mapFramePanel) {
                    console.log('🔍 Found mapframe panel:', mapFramePanel.$className);
                    console.log('🔍 Panel layout:', mapFramePanel.layout);
                    
                    // Force bottom docking with explicit configuration
                    dockedSensorPanel.dock = 'bottom';
                    
                    if (mapFramePanel.addDocked) {
                        mapFramePanel.addDocked(dockedSensorPanel);
                        console.log('✅ Docked sensor panel to BOTTOM of map panel');
                        me.backgroundPanel = dockedSensorPanel;
                    } else {
                        console.warn('❌ addDocked not available on map panel');
                    }
                } else if (skeleton.mapframe.addDocked) {
                    // Direct docking to mapframe itself
                    skeleton.mapframe.addDocked(dockedSensorPanel);
                    console.log('✅ Direct docking to mapframe');
                    me.backgroundPanel = dockedSensorPanel;
                } else {
                    console.warn('❌ No docking method available');
                    console.log('Available mapframe methods:', Object.keys(skeleton.mapframe));
                }
            }
        } catch (e) {
            console.error('❌ Failed to dock sensor panel:', e.message);
            console.error('Available methods:', skeleton.mapframe ? Object.keys(skeleton.mapframe).slice(0, 10) : 'undefined');
        }
        
        // Store reference for navigation access
        me.backgroundPanel = dockedSensorPanel;
        
        // Panel starts hidden - will be shown when Sensor Monitor navigation tab is clicked
        console.log('✅ Docked sensor panel created (hidden) - ready for navigation activation');
    },
    
    // Called from Navigation component when vehicle is selected
    showVehicleSensors: function(vehicleId, vehicleName, vehicleRecord) {
        var me = this;
        
        console.log('🚗 Vehicle selected from navigation:', vehicleName, 'ID:', vehicleId);
        
        me.currentVehicleId = vehicleId;
        me.currentVehicleName = vehicleName;
        me.currentVehicleRecord = vehicleRecord;
        
        // Update panel title
        if (me.backgroundPanel) {
            me.backgroundPanel.setTitle('🔧 Sensor Monitor - ' + vehicleName + ' (Real-time)');
            
            // Expand panel when vehicle selected
            if (me.backgroundPanel.collapsed) {
                me.backgroundPanel.expand();
            }
            
            // Load sensor data for this specific vehicle
            me.loadVehicleSensors(vehicleId);
            me.startVehicleRefresh(vehicleId);
        }
    },
    
    loadVehicleSensors: function(vehicleId) {
        var me = this;
        
        console.log('🔄 Loading sensor data for vehicle:', vehicleId);
        
        Ext.Ajax.request({
            url: '/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processVehicleSensorData(data, vehicleId);
                } catch (e) {
                    console.error('❌ API parse error:', e);
                    me.tryExternalAPI(vehicleId);
                }
            },
            failure: function() {
                console.warn('❌ Backend API failed, trying external...');
                me.tryExternalAPI(vehicleId);
            }
        });
    },
    
    tryExternalAPI: function(vehicleId) {
        var me = this;
        
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processVehicleSensorData(data, vehicleId);
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
    
    processVehicleSensorData: function(data, vehicleId) {
        var me = this;
        var sensorArray = [];
        
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            var vehicle = null;
            Ext.each(data.objects, function(obj) {
                if (obj.id == vehicleId) {
                    vehicle = obj;
                    return false;
                }
            });
            
            if (vehicle) {
                console.log('✅ Found vehicle:', vehicle.name);
                
                // Add vehicle status sensors
                sensorArray.push({
                    sensor_name: 'Vehicle Speed',
                    sensor_type: 'speed',
                    current_value: vehicle.last_event ? vehicle.last_event.speed || 0 : 0,
                    unit: 'km/h',
                    status: 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000)
                });
                
                sensorArray.push({
                    sensor_name: 'Engine Status',
                    sensor_type: 'engine',
                    current_value: vehicle.firing ? 'ON' : 'OFF',
                    unit: '',
                    status: 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000)
                });
                
                // Add all sensors for this specific vehicle
                if (vehicle.sensors) {
                    Ext.Object.each(vehicle.sensors, function(name, value) {
                        var parts = value.split('|');
                        if (parts.length >= 4) {
                            sensorArray.push({
                                sensor_name: name,
                                sensor_type: me.determineSensorType(name),
                                current_value: parseFloat(parts[3]),
                                unit: me.extractUnit(parts[0]),
                                status: me.calculateSensorStatus(parseFloat(parts[3]), me.determineSensorType(name)),
                                last_update: new Date(parseInt(parts[1]) * 1000)
                            });
                        }
                    });
                }
            }
        }
        
        console.log('✅ Processed', sensorArray.length, 'sensors for vehicle:', vehicleId);
        
        if (me.backgroundPanel) {
            var grid = me.backgroundPanel.down('grid');
            if (grid) {
                grid.getStore().loadData(sensorArray);
            }
        }
    },
    
    startVehicleRefresh: function(vehicleId) {
        var me = this;
        
        me.stopVehicleRefresh();
        
        me.refreshTask = setInterval(function() {
            me.loadVehicleSensors(vehicleId);
        }, 500);
        
        console.log('🔄 Real-time refresh started for vehicle:', vehicleId);
    },
    
    stopVehicleRefresh: function() {
        var me = this;
        
        if (me.refreshTask) {
            clearInterval(me.refreshTask);
            me.refreshTask = null;
        }
    },
    
    showNoSensorData: function() {
        var me = this;
        
        if (me.backgroundPanel) {
            var grid = me.backgroundPanel.down('grid');
            if (grid) {
                grid.getStore().loadData([{
                    sensor_name: 'No Data Available',
                    sensor_type: 'error',
                    current_value: 'Unable to load sensor data',
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
