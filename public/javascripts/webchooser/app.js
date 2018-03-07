/**
MAin module for the WebChooser application

@module webchooser
@namespace webchooser
@main webchooser
*/
var webchooser = {
	/**
	Namespace for running the instances that are needed across the webchooser
	application.
	
	@submodule app
	@namespace app
	*/
	app: {
		/**
		* Property houses the application main navbar options
		*
		* @property navbarOptions
		* @type Array
		*/
		navbarOptions: [
			{url: 'build', text: 'Build'},
			{url: 'analyse', text: 'Analyse'},
			{url: 'view', text: 'View'}
		]		
	},
	
	/**
	Namespace for the WebChooser router implementation.
	
	@submodule router
	@namespace router
	*/
	router: {},
	
	/**
	Namespace for the WebChooser view implementations.
	House the application credentials and module view implementations.
	*/
	view: {},
	
	/**
	Namespace for the WebChooser component implementations.
	*/
	component: {},
	
	/**
	Namespace for webchooser model implementations.
	Houses models and state models implementations.
	
	@submodel models
	@namespace models
	*/
	model: {},
	
	/**
	Namespace for the WebChooser storage implementation.
	
	@submodule storage
	@namespace storage
	*/
	storage: {},
	
	/**
	Initialize the router for the application.
	
	@method initializeRouter
	*/
	initializeRouter: function() {
		// 'use strict';
		
		// create an instance of the RouteManager in hold it in
		// webchooser.app.router
		webchooser.app.router = new webchooser.router.RouteManager();
	},
		
	/**
	Initialize moduels used in the application.
	
	@method initializeModels
	*/
	initializeModels: function() {
		
	},
	
	/**
	Method registers subscribed events
	
	@method initializeEventListeners
	*/
	initializeEventListeners: function() {
		
	},
	
	/**
 
	@method onDocumentReady
	**/
	onDocumentReady: function () {
		'use strict';
		
		webchooser.initializeEventListeners();
		webchooser.initializeModels();
		webchooser.initializeRouter();
	},
 
	/**
	Entry point for the refine application.
	Registers the onDocumentReady event.
 
	@method initialize
	**/
	initialize: function () {
		'use strict';
		$(document).ready(webchooser.onDocumentReady);
	}
	
};

// var sources = [
// 	{id: 1, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 2, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 3, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 4, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 5, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 6, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 7, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'none'},
// 	{id: 8, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 9, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 10, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: 'dogfoodall.hdt'},
// 	{id: 11, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: ''},
// 	{id: 12, name: 'insight.profile.csv', location: '', project: 1, description: '', dataType: '', size: 10, lastUpdated: '2011/04/25', mappedTo: ''}
// ],
// columns = ['name', 'size', 'lastUpdated', 'mappedTo'];
//
// React.renderComponent(
// 	<DataTable data={sources} columns={columns} />,
// 	document.getElementById('source-data-table')
// );

webchooser.initialize();