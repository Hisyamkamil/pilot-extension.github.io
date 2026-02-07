Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V3 (Card-Based Layout) extension initializing...');
        
        // Store reference for later use
        window.dashpanelModule = me;
        
        // Add sub-panel to existing Online navigation
        me.addSubPanelToOnlineNavigation();
        
        // Create card-based sensor panel (docked to mapframe)
        Ext.defer(function() {
            me.createCardBasedSensorPanel();
        }, 1000);

        console.log('✅ V3 card-based sensor panel extension initialized');
    },
    
    addSubPanelToOnlineNavigation: function() {
        var me = this;
        
        // Access existing Online navigation panel (LEFT side)
        if (skeleton && skeleton.navigation && skeleton.navigation.online) {
            var onlinePanel = skeleton.navigation.online;
            
            console.log('Found existing Online panel, adding Sensor Monitor sub-panel...');
            
            // Create vehicle tree sub-panel UNDER existing Online tree
            var sensorSubPanel = Ext.create('Store.dashpanel.view.Navigation', {
                title: 'Sensor Monitor',
                iconCls: 'fa fa-tachometer-alt',
                height: 300,
                collapsible: true,
                split: true
            });
            
            // Add sub-panel to existing Online navigation
            if (onlinePanel.add) {
                onlinePanel.add(sensorSubPanel);
                console.log('✅ Sensor Monitor sub-panel added UNDER Online tree');
                
                // Listen for tab selection to show/hide docked panel
                if (onlinePanel.on) {
                    console.log('🔍 Setting up tabchange listener on Online panel');
                    onlinePanel.on('tabchange', function(tabPanel, newCard, oldCard) {
                        console.log('🔍 Tab changed from:', oldCard ? oldCard.title : 'none', 'to:', newCard ? newCard.title : 'none');
                        console.log('🔍 cardSensorPanel available:', !!me.cardSensorPanel);
                        
                        if (newCard && newCard.title === 'Sensor Monitor' && me.cardSensorPanel) {
                            console.log('🔧 Sensor Monitor tab selected - showing card-based panel');
                            me.cardSensorPanel.setHidden(false);
                            me.cardSensorPanel.show();
                        } else if (me.cardSensorPanel && !me.cardSensorPanel.hidden) {
                            console.log('🔧 Other tab selected - hiding card-based panel');
                            me.cardSensorPanel.setHidden(true);
                            me.cardSensorPanel.hide();
                        }
                    });
                    
                    // Listen for sub-panel activation
                    sensorSubPanel.on('activate', function() {
                        console.log('🔧 Sensor Monitor sub-panel activated');
                        if (me.cardSensorPanel) {
                            me.cardSensorPanel.setHidden(false);
                            me.cardSensorPanel.show();
                            console.log('✅ Card-based panel shown via sub-panel activation');
                        }
                    });
                    
                    sensorSubPanel.on('deactivate', function() {
                        console.log('🔧 Sensor Monitor sub-panel deactivated');
                        if (me.cardSensorPanel) {
                            me.cardSensorPanel.setHidden(true);
                            me.cardSensorPanel.hide();
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
    
    createCardBasedSensorPanel: function() {
        var me = this;
        
        console.log('📊 Creating card-based sensor panel (docked to mapframe)...');
        
        // Create card-based sensor panel
        var cardSensorPanel = Ext.create('Ext.panel.Panel', {
            title: 'Sensor Monitor - Sensor Data',
            height: 325,
            dock: 'bottom',
            split: true,
            resizable: true,
            collapsible: true,
            collapsed: false,
            collapseFirst: true,  // Move collapse tool to LEFT
            animCollapse: 300,
            collapseDirection: 'bottom',
            titleCollapse: true,
            collapseMode: 'mini',  // Mini collapse mode for compact header
            layout: 'fit',
            hidden: true,
            id: 'dashpanel-v3-sensor-panel',
            
            // Configure header for left-positioned collapse and compact sizing
            header: {
                titlePosition: 1,  // Title after tools (collapse button on left)
                cls: 'dashpanel-v3-compact-header'  // Custom CSS class for compact styling
            },
            
            // Configure collapsed state styling
            listeners: {
                collapse: function(panel) {
                    // Make header compact when collapsed (like follow_text button)
                    var header = panel.getHeader();
                    if (header) {
                        header.setStyle({
                            'width': 'auto',
                            'max-width': '300px',
                            'display': 'inline-block',
                            'position': 'relative',
                            'float': 'left'
                        });
                        console.log('✅ Panel collapsed with compact header');
                    }
                },
                expand: function(panel) {
                    // Restore full width when expanded
                    var header = panel.getHeader();
                    if (header) {
                        header.setStyle({
                            'width': '100%',
                            'max-width': 'none',
                            'display': 'block',
                            'position': 'static',
                            'float': 'none'
                        });
                        console.log('✅ Panel expanded with full header');
                    }
                }
            },
            
            // Multi-column layout container (like newspaper columns)
            items: [{
                xtype: 'container',
                cls: 'dashpanel-v3-sensor-columns',
                scrollable: true,
                autoScroll: true,
                html: '<div id="dashpanel-v3-columns-container" style="' +
                      'display: flex; ' +
                      'flex-wrap: wrap; ' +
                      'align-items: flex-start; ' +
                      'padding: 10px; ' +
                      'gap: 20px;' +
                      '"></div>',
                itemId: 'sensorColumnContainer'
            }],
            
            listeners: {
                beforecollapse: function() {
                    console.log('🔽 Card panel collapsing...');
                },
                collapse: function() {
                    console.log('✅ Card panel collapsed');
                },
                beforeexpand: function() {
                    console.log('🔼 Card panel expanding...');
                },
                expand: function() {
                    console.log('✅ Card panel expanded');
                }
            }
        });
        
        // Add docked panel to mapframe
        try {
            if (skeleton && skeleton.mapframe) {
                console.log('🔍 mapframe available for card panel docking');
                
                var mapFramePanel = skeleton.mapframe.down('panel');
                if (mapFramePanel && mapFramePanel.addDocked) {
                    mapFramePanel.addDocked(cardSensorPanel);
                    console.log('✅ Card-based sensor panel docked to bottom of mapframe');
                    me.cardSensorPanel = cardSensorPanel;
                } else if (skeleton.mapframe.addDocked) {
                    skeleton.mapframe.addDocked(cardSensorPanel);
                    console.log('✅ Card-based panel direct docking to mapframe');
                    me.cardSensorPanel = cardSensorPanel;
                } else {
                    console.warn('❌ No docking method available for card panel');
                }
            }
        } catch (e) {
            console.error('❌ Failed to dock card-based sensor panel:', e.message);
        }
        
        console.log('✅ V3 card-based sensor panel ready - waiting for vehicle selection');
    },
    
    // Called from Navigation component when vehicle is selected
    showVehicleSensors: function(vehicleId, vehicleName, vehicleRecord) {
        var me = this;
        
        console.log('🚗 Vehicle selected for card display:', vehicleName, 'ID:', vehicleId);
        
        me.currentVehicleId = vehicleId;
        me.currentVehicleName = vehicleName;
        me.currentVehicleRecord = vehicleRecord;
        
        // Update panel title and load card data
        if (me.cardSensorPanel) {
            me.cardSensorPanel.setTitle('Sensor Monitor - ' + vehicleName);
            
            // Load sensor data into cards (no table)
            me.loadVehicleSensorCards(vehicleId);
            me.startVehicleRefresh(vehicleId);
            
            console.log('✅ Vehicle data loaded into sensor cards');
        }
    },
    
    loadVehicleSensorCards: function(vehicleId) {
        var me = this;
        
        if (!me.currentVehicleId) {
            return;
        }
        
        console.log('🔄 Loading sensor data for card layout, vehicle:', me.currentVehicleId);
        
        // Use same API as V1/V2
        Ext.Ajax.request({
            url: '/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processSensorDataCards(data);
                } catch (e) {
                    console.error('❌ API parse error:', e);
                    me.tryExternalAPI();
                }
            },
            failure: function(response) {
                console.warn('❌ Backend API failed, trying external...');
                me.tryExternalAPI();
            }
        });
    },
    
    tryExternalAPI: function() {
        var me = this;
        
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processSensorDataCards(data);
                } catch (e) {
                    console.error('❌ External API parse error:', e);
                    me.showNoSensorColumns();
                }
            },
            failure: function(response) {
                console.error('❌ External API failed:', response.status);
                me.showNoSensorColumns();
            }
        });
    },
    
    processSensorDataCards: function(data) {
        var me = this;
        var sensorCards = [];
        
        console.log('Processing sensor data for card layout...');
        
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            // Find vehicle by ID
            var vehicle = null;
            Ext.each(data.objects, function(obj) {
                if (obj.id == me.currentVehicleId || obj.veh_id == me.currentVehicleId) {
                    vehicle = obj;
                    return false;
                }
            });
            
            if (!vehicle) {
                console.error('❌ Vehicle not found:', me.currentVehicleId);
                me.showNoSensorColumns();
                return;
            }
            
            console.log('✅ Found vehicle data for cards:', vehicle.name);
            
            // Add basic vehicle sensors as cards
            if (vehicle.last_event && vehicle.last_event.speed !== undefined) {
                sensorCards.push(me.createSensorRow({
                    name: 'Vehicle Speed',
                    type: 'speed',
                    value: vehicle.last_event.speed,
                    unit: 'km/h',
                    status: vehicle.last_event.speed > 80 ? 'warning' : 'normal',
                    icon: 'fa fa-speedometer'
                }));
            }
            
            if (vehicle.firing !== undefined) {
                sensorCards.push(me.createSensorRow({
                    name: 'Engine Status',
                    type: 'engine',
                    value: vehicle.firing ? 'ON' : 'OFF',
                    unit: '',
                    status: 'normal',
                    icon: 'fa fa-cog'
                }));
            }
            
            // Process all sensors as cards
            if (vehicle.sensors && typeof vehicle.sensors === 'object') {
                console.log('Processing', Object.keys(vehicle.sensors).length, 'sensors as cards...');
                
                Ext.Object.each(vehicle.sensors, function(sensorName, sensorValue) {
                    var parts = sensorValue.split('|');
                    if (parts.length >= 4) {
                        var humanValue = parts[0];
                        var digitalValue = parseFloat(parts[3]);
                        var sensorType = me.determineSensorType(sensorName);
                        var status = me.calculateSensorStatus(digitalValue, sensorType);
                        
                        sensorCards.push(me.createSensorRow({
                            name: sensorName,
                            type: sensorType,
                            value: digitalValue,
                            unit: me.extractUnit(humanValue),
                            status: status,
                            icon: me.getSensorIcon(sensorType)
                        }));
                    }
                });
            }
        }
        
        if (sensorCards.length === 0) {
            me.showNoSensorColumns();
            return;
        }
        
        console.log('✅ Created', sensorCards.length, 'sensor rows for multi-column layout');
        me.updateSensorColumns(sensorCards);
    },
    
    createSensorRow: function(sensor) {
        var me = this;
        
        // Get status color
        var statusColor = '#008000';  // green default
        if (sensor.status === 'warning') statusColor = '#ff8c00';
        else if (sensor.status === 'critical') statusColor = '#ff0000';
        
        // Format value
        var formattedValue = typeof sensor.value === 'number' ?
                           Ext.util.Format.number(sensor.value, '0.##') : sensor.value;
        
        // Create compact row: {icon} {name} {value} {unit}
        return '<div style="' +
               'display: flex; ' +
               'align-items: center; ' +
               'padding: 3px 0; ' +
               'border-bottom: 1px solid #eee; ' +
               'font-size: 11px; ' +
               'line-height: 1.2;' +
               '">' +
               '<i class="' + sensor.icon + '" style="' +
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
    
    updateSensorColumns: function(sensorRows) {
        var me = this;
        
        if (me.cardSensorPanel) {
            var container = document.getElementById('dashpanel-v3-columns-container');
            if (container) {
                // Calculate how many sensors per column (aim for 3 columns)
                var sensorsPerColumn = Math.ceil(sensorRows.length / 3);
                var columnsHtml = '';
                
                // Create seamless 3 columns (no card separation)
                for (var col = 0; col < 3; col++) {
                    var startIdx = col * sensorsPerColumn;
                    var endIdx = Math.min(startIdx + sensorsPerColumn, sensorRows.length);
                    
                    if (startIdx < sensorRows.length) {
                        columnsHtml += '<div style="' +
                                     'flex: 1; ' +
                                     'min-width: 200px; ' +
                                     'padding: 5px 10px; ' +
                                     'border-right: ' + (col < 2 ? '1px solid #ddd' : 'none') + ';' +  // Separator between columns only
                                     '">';
                        
                        // Add sensor rows to this column
                        for (var i = startIdx; i < endIdx; i++) {
                            columnsHtml += sensorRows[i];
                        }
                        
                        columnsHtml += '</div>';
                    }
                }
                
                container.innerHTML = columnsHtml;
                console.log('✅ Updated', sensorRows.length, 'sensors in', Math.min(3, Math.ceil(sensorRows.length / sensorsPerColumn)), 'columns');
            }
        }
    },
    
    showNoSensorColumns: function() {
        var me = this;
        
        if (me.cardSensorPanel) {
            var container = document.getElementById('dashpanel-v3-columns-container');
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">' +
                                    '<i class="fa fa-exclamation-triangle" style="font-size: 48px; color: #ff8c00;"></i>' +
                                    '<h3>No Sensor Data Available</h3>' +
                                    '<p>Unable to load sensor data for this vehicle</p>' +
                                    '</div>';
            }
        }
    },
    
    startVehicleRefresh: function(vehicleId) {
        var me = this;
        
        me.stopVehicleRefresh();
        
        me.refreshTask = setInterval(function() {
            me.loadVehicleSensorCards(vehicleId);
        }, 500);
        
        console.log('🔄 Real-time card refresh started for vehicle:', vehicleId);
    },
    
    stopVehicleRefresh: function() {
        var me = this;
        
        if (me.refreshTask) {
            clearInterval(me.refreshTask);
            me.refreshTask = null;
        }
    },
    
    // Helper methods (same as V1/V2)
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
    
    extractUnit: function(humValue) {
        if (!humValue) return '';
        
        var matches = humValue.toString().match(/([a-zA-Zа-яА-Я°%/]+)$/);
        return matches ? matches[1] : '';
    },
    
    calculateSensorStatus: function(value, sensorType) {
        if (value === null || value === undefined) return 'unknown';
        
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
            case 'weight': return 'fa fa-weight';
            case 'engine': return 'fa fa-cog';
            default: return 'fa fa-microchip';
        }
    }
});
