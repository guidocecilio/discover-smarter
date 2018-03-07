(function ($, _, app, config) {
	'use strict';
 
	/**
	Manages persistence of data for the refine application.
 
	@class Storage
	@submodule storage
	@namespace storage
	**/
	app.storage = webchooser.storage || {};
 
	/**
	Method overrides Backbone.sync implementation
	to persist application data.
 
	@method sync
	**/
	app.storage.sync = function(storage, key) {
		storage.init();
		return function(method, model, options) {
			var id, storageKey;
			id = model.id || key;
			storageKey = id;
 
			switch (method) {
			case 'read':
				storage.getItem(
					storageKey,
					function (result) {
						var arr, modules;
						if (result) {
							if (model.id) {
								// as we are using options.success. The function
								// automatically parse the model and use the 
								// model.set() function to set the model.
//								model.set(JSON.parse(result));
								model = JSON.parse(result);
							} else if (model.models) {
								arr = JSON.parse(result);
								modules = [];
								$(arr).each(function (idx, module) {
									modules.push(new model.model(module));
								});
								model.reset(modules);
							}
							else {
								// as we are using options.success. The function
								// automatically parse the model and use the 
								// model.set() function to set the model.
								model = JSON.parse(result);
							}
							if (options && options.hasOwnProperty('success')) {
								options.success(model);
							}
						} else {
							var xhr = refine.storage.ajax({
								url: config.prefix + (_.isFunction(model.url) ? model.url() : model.url),
								success: function(resp) {
									
									
			  					}
							});
						}
					}
				);
				break;
			case 'create':
				storage.setItem(storageKey, JSON.stringify(model));
				if (options && options.hasOwnProperty('success')) {
					options.success(model);
				}
				break;
			case 'update':
				storage.setItem(storageKey, JSON.stringify(model));
				if (options && options.hasOwnProperty('success')) {
					options.success(model);
				}
				break;
			case 'delete':
				storage.removeItem(storageKey);
				if (options && options.hasOwnProperty('success')) {
					options.success(model);
				}
				break;
			}
		};
	};
	
	/**
	 wrapper for jQuery ajax with common defaults
	  
	 explicitly stating UTF-8 is required for IE (when sending data)
 	 this has to be POST to ensure correct encoding, GET runs into Tomcat
	 encoding issues when parsing the URL in request.getParameter()
	  
	 we use http status 403 to indicate that the ajax failed because the user session 
	 is not valid (for example, the session expired or the server was restarted and
	 the user did not use the remember-me cookie). In this case, we simply reload the
	 page which would either cause re-authentication at some SSO server, or present 
	 the user with the login screen (/login).
	  
	 we always add "s_ajax=y" to the request to mark it as Ajax so that server knows
	 when to send a 403 and when to redirect to the login screen (you can't redirect
	 an AJAX request to a login screen)
	 
	 when a communication error occurs, we return the appropriate message to the 
	 success callback
	  
	 @param {Object} options
	 @returns {Object} the xhr
	 **/
	app.storage.ajax = function(options) {
		var success = options.success;
		var ajaxOptions = 
			$.extend({}, 
				{ type : 'GET',
				  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
				  error: function(jqXHR, textStatus, errorThrown) {
					  var data = {};
					  if (jqXHR.status && jqXHR.status == 403) {
						  // tell browser to reload the current page
//						  window.location = encodeURI(refine.ActionsURL.URLACCOUNT_timedout);
					  } else if (jqXHR.status && jqXHR.status == 404) { 
						  if (success) {
							  data.message = "The request failed because the item requested is not found";
							  success(data);
						  }
				  	  } else {
						  if (success) {
							  data.message = "An unexpected error occurred while communicating with the server. You may want to reload the current page and try again.";
							  success(data);
						  }
					  }
				  }
			    }, options);
		
//		if (this.xhr) {
//			this.xhr.abort();
//		}
		this.xhr = $.ajax(ajaxOptions);
		return this.xhr;
	};
 
	/**
	Manages the persistence of data to local storage.
 
	@class Local
	@submodule storage
	@namespace storage
	**/
	app.storage.local = {
		/**
		Method retrieves item from local storage.
 
		@method getItem
		@param {String} storageKey
		@param {Function} success
		**/
		getItem: function(storageKey, success) {
			return success(window.localStorage.getItem(storageKey));
		},
 
		/**
		Method sets item into local storage.
 
		@method setItem
		**/
		setItem: function(storageKey, json) {
			window.localStorage.setItem(storageKey, json);
		},
 
		/**
		Method removes item from local storage.
 
		@method setItem
		**/
		removeItem: function(storageKey) {
			window.localStorage.removeItem(storageKey);
		},
 
		/**
		Entry point for the local storage implementation.
 
		@method init
		**/
		init: function() {}
	};
 
})(jQuery, _, webchooser, undefined);