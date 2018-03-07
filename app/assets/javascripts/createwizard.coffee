class ApplicationModal

	constructor: (options) ->
		@options = $.extend {
			header: 'Modal Heading'
			content: 'Howdy there friends'
			open_now: true
		}, options

		@hideOtherModals()
		@buildModal()
		@openModal() if @options.open_now

	hideOtherModals: ->
		$('.modal').modal('hide').remove()

	buildModal: ->
		@container = $("<div></div>").addClass('modal')
		@container.append 	"""<div class="modal-dialog">
						        <div class="modal-content">
						            <div class="modal-header">
						            	<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
						            	<h4 class="modal-title" id="myModalLabel">Modal Wizzard  title</h4>
						            </div>
						            <div class="modal-body">
						                <h3>Modal Body</h3>
						            </div>
						            <div class="modal-footer">
						                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
						                <button type="button" class="btn btn-primary">Save changes</button>
						        </div>
						    </div>
						  </div>"""
		

		$('body').append @container

	openModal: ->
		@container.modal('show')

window.ApplicationModal = ApplicationModal