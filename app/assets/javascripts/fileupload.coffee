##################################################
# Extensions to the dropzone plugin that is currently 
# used for uploading files that 
# then used to show entity extraction
##################################################
Dropzone.options.fileUpload = init: ->
	_this = this
	$.getJSON "/file", (files) ->
		allowed_types = [
			".txt"
			".pdf"
			".doc"
		]
		for file of files
			allow = false
			for t of allowed_types
				unless files[file].name.indexOf(allowed_types[t]) is -1
					allow = true
					continue
			_this.emit "addedfile", files[file]	if allow
		return

	@on "addedfile", (file) ->
		insertButton = Dropzone.createElement("<button type=\"button\" class=\"btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-flash\"></span>Add to Graph</button>")
		insertButton.addEventListener "click", (e) ->
			e.preventDefault()
			e.stopPropagation()
			edit = ace.edit($(".ace_editor").attr("id"))
			edit.setValue "extractor.extract(PATH+\"" + file.name + "\")"
			$("#search").trigger "prepDoc", file.name
			return

		file.previewElement.appendChild insertButton
		
		#remove button
		removeButton = Dropzone.createElement("<button type=\"button\" class=\"btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-remove\"></span></button>")
		removeButton.addEventListener "click", (e) ->
			e.preventDefault()
			e.stopPropagation()
			$.ajax
				url: "/file/" + file.name
				type: "DELETE"
				success: (result) ->
					console.log "sucessfully deleted file."
					return

			_this.removeFile file
			return

		file.previewElement.appendChild removeButton
		return

	return