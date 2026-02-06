Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V2 (Sub-panel + MainPanelV2) extension initializing...');
        
        // Store reference for later use
        window.dashpanelModule = me;
        
        // Add sub-panel to existing Online navigation (left side)
        me.addSubPanelToOnlineNavigation();
    },
    
    addSubPanelToOnlineNavigation: function() {
        var me = this;
        
        // Access existing Online navigation panel
        if (skeleton && skeleton.navigation && skeleton.navigation.online) {
            var onlinePanel = skeleton.navigation.online;
            
            console.log('Found existing Online panel, adding Dashboard sub-panel...');
            
            // Create vehicle tree for dashboard (sub-panel in Online navigation)
            var dashboardSubPanel = Ext.create('Ext.panel.Panel', {
                title: 'Dashboard Panel',
                iconCls: 'fa fa-tachometer-alt',
                layout: 'fit',
                height: 300,
                collapsible: true,
                split: true,
                
                items: [{
                    xtype: 'treepanel',
                    title: 'Vehicles for Dashboard',
                    tools:[{
                        xtype:'button',
                        iconCls: 'fa fa-rotate',
                        tooltip: 'Refresh',
                        handler: function () {
                            this.up('treepanel').getStore().load();
                        }
                    }],
                    rootVisible: false,
                    useArrows: true,
                    border: false,
                    // Load vehicles from PILOT API
                    store: Ext.create('Ext.data.TreeStore', {
                        proxy: {
                            type: 'ajax',
                            url: '/ax/tree.php?vehs=1&state=1'
                        },
                        root: {
                            text: 'Vehicles',
                            expanded: true
                        },
                        autoLoad: true
                    }),
                    columns: [{
                        text: 'Vehicle',
                        xtype:'treecolumn',
                        dataIndex: 'name',
                        flex: 2,
                        renderer: function(value) {
                            return value || 'Unknown';
                        }
                    }, {
                        text: 'Status',
                        dataIndex: 'state',
                        width: 70,
                        renderer: function(value) {
                            if (value === 1) {
                                return '<span style="color: green;">●</span>';
                            }
                            return '<span style="color: red;">●</span>';
                        }
                    }],
                    listeners: {
                        selectionchange: function(tree, selected) {
                            if (selected.length > 0) {
                                var record = selected[0];
                                if (record.get('leaf') && (record.get('id') || record.get('vehicle_id'))) {
                                    var vehicleId = record.get('id') || record.get('vehicle_id');
                                    var vehicleName = record.get('name') || record.get('text') || 'Unknown Vehicle';
                                    me.showMainPanelV2(vehicleId, vehicleName, record);
                                }
                            }
                        }
                    }
                }]
            });
            
            // Add sub-panel to existing Online navigation
            if (onlinePanel.add) {
                onlinePanel.add(dashboardSubPanel);
                console.log('✅ Dashboard sub-panel added to Online navigation');
            } else {
                console.error('❌ Cannot add sub-panel to Online navigation');
            }
            
        } else {
            console.error('❌ Online navigation not available');
        }
    },
    
    showMainPanelV2: function(vehicleId, vehicleName, vehicleRecord) {
        var me = this;
        
        console.log('🚗 Vehicle selected from sub-panel:', vehicleName, 'ID:', vehicleId);
        console.log('🔍 Will show MainPanelV2 in main content area...');
        
        // Check if MainPanelV2 already exists
        var existingPanel = Ext.getCmp('dashpanel-main-v2');
        if (existingPanel) {
            console.log('✅ MainPanelV2 exists, updating with new vehicle');
            existingPanel.loadVehicleData(vehicleId, vehicleName, vehicleRecord);
            return;
        }
        
        // Create MainPanelV2 component (map + sensors)
        console.log('🚀 Creating MainPanelV2 component...');
        var mainPanel = Ext.create('Store.dashpanel.view.MainPanelV2', {
            id: 'dashpanel-main-v2'
        });
        
        console.log('📊 MainPanelV2 created, adding to main content area...');
        
        // Try multiple approaches to show MainPanelV2 as main panel
        try {
            // Method 1: Standard skeleton.mapframe.add()
            skeleton.mapframe.add(mainPanel);
            console.log('✅ Method 1 success: MainPanelV2 added to mapframe');
            
        } catch (e1) {
            console.warn('⚠️ Method 1 failed:', e1.message);
            
            try {
                // Method 2: Items collection
                if (skeleton.mapframe.items && skeleton.mapframe.items.add) {
                    skeleton.mapframe.items.add(mainPanel);
                    console.log('✅ Method 2 success: MainPanelV2 added via items');
                } else {
                    throw new Error('Items not available');
                }
                
            } catch (e2) {
                console.warn('⚠️ Method 2 failed:', e2.message);
                
                try {
                    // Method 3: Direct render to mapframe element
                    if (skeleton.mapframe.el) {
                        mainPanel.render(skeleton.mapframe.el);
                        console.log('✅ Method 3 success: MainPanelV2 rendered to element');
                    } else {
                        throw new Error('Element not available');
                    }
                    
                } catch (e3) {
                    console.error('❌ All methods failed. Mapframe integration not possible.');
                    console.error('Mapframe type:', skeleton.mapframe.$className);
                    console.error('Available methods:', Object.keys(skeleton.mapframe));
                    
                    // Show user-friendly error
                    Ext.Msg.alert('Integration Error', 
                        'Cannot integrate MainPanelV2 with this PILOT version.<br><br>' +
                        'Console shows: "' + e3.message + '"<br>' +
                        'Mapframe type: ' + (skeleton.mapframe.$className || 'unknown'));
                    return;
                }
            }
        }
        
        // Load vehicle data into MainPanelV2
        try {
            console.log('📊 Loading vehicle data into MainPanelV2...');
            mainPanel.loadVehicleData(vehicleId, vehicleName, vehicleRecord);
            console.log('✅ MainPanelV2 setup complete');
        } catch (e) {
            console.error('❌ Error loading vehicle data into MainPanelV2:', e);
        }
    }
});
