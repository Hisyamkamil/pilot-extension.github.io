Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V2 (Integrated Template Pattern) extension initializing...');
        
        // Store reference for later use
        window.dashpanelModule = me;
        
        // 1. Add sub-panel to existing Online navigation (like before)
        me.addSubPanelToOnlineNavigation();
        
        // 2. Create integrated main panel (like template-app/Map.js)
        var mainPanel = Ext.create('Store.dashpanel.view.MainPanelV2');
        
        // 3. Add to mapframe (integrated layout, not overlay)
        try {
            skeleton.mapframe.add(mainPanel);
            console.log('✅ MainPanelV2 integrated into mapframe (map + sensors layout)');
            me.mainPanel = mainPanel;
        } catch (e) {
            console.error('❌ Integration failed:', e);
            // Try alternative approach
            if (skeleton.mapframe.removeAll) {
                skeleton.mapframe.removeAll();
                skeleton.mapframe.add(mainPanel);
                console.log('✅ Replaced mapframe with MainPanelV2');
                me.mainPanel = mainPanel;
            }
        }

        console.log('✅ V2 with integrated main panel (template pattern applied)');
    },
    
    addSubPanelToOnlineNavigation: function() {
        var me = this;
        
        // Access existing Online navigation panel
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
            } else {
                console.error('❌ Cannot add sub-panel to Online navigation');
            }
            
        } else {
            console.error('❌ Online navigation not available');
        }
    },
    
    // Called from Navigation component when vehicle is selected
    showVehicleSensors: function(vehicleId, vehicleName, vehicleRecord) {
        var me = this;
        
        console.log('🚗 Vehicle selected from Sensor Monitor navigation:', vehicleName, 'ID:', vehicleId);
        
        // Load vehicle data into integrated MainPanelV2 (map + sensors)
        if (me.mainPanel && me.mainPanel.loadVehicleData) {
            me.mainPanel.loadVehicleData(vehicleId, vehicleName, vehicleRecord);
            console.log('✅ Vehicle data loaded into integrated MainPanelV2 (map + sensors)');
        } else {
            console.error('❌ MainPanelV2 not available - integration may have failed');
            console.log('Available mainPanel methods:', me.mainPanel ? Object.keys(me.mainPanel).slice(0, 10) : 'undefined');
        }
    }
});
