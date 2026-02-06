Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V2 (Pattern 1 + Map Integration) extension initializing...');
        
        // Create navigation tab component (Pattern 1) - uses existing vehicle loading
        var navTab = Ext.create('Store.dashpanel.view.Navigation');
        
        // Create hybrid main panel: Map (top) + Sensors (bottom)
        var mainPanel = Ext.create('Store.dashpanel.view.MainPanelV2');
        
        // Link navigation tab to main panel (mandatory Pattern 1 requirement)
        navTab.map_frame = mainPanel;
        
        // Add to PILOT skeleton (Pattern 1)
        skeleton.navigation.add(navTab);
        skeleton.mapframe.add(mainPanel);
        
        console.log('✅ V2 navigation tab and hybrid main panel added');
    }
});
