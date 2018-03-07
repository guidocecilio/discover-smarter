function addNodeHash(hash, nodes, hdt, entry, role) {
	var sh = hdt.dictionary.getNshared();
	var r = role;	// r in (SH, S, O)
	var roleId = role;	// roleId in (S, O)
	if(entry<=sh) {
		r= HDT.DictionarySectionRole.SHARED;
		roleId= HDT.DictionarySectionRole.SUBJECT;
	}
	var key = r+"_"+entry;
	var val = hash[key];
	if(typeof val !== 'undefined') {
		return val;
	} else {
		var obj = {};
		obj.hdtid = entry;
		obj.name = hdt.dictionary.idToString(entry, roleId);
		obj.group = r;
		obj.role = role;
		nodes.push(obj);
		hash[key] = obj;
		return obj;
	}
}

function getD3Graph(hdt, s, p, o, limit, g) {
	var graph = g;
	if(typeof g === 'undefined') {
		graph = { "nodes":[], "links":[], "nodehash":{} };
	}

	var d = hdt.dictionary;

	var s = d.stringToId(s, HDT.DictionarySectionRole.SUBJECT);
	var p = d.stringToId(p, HDT.DictionarySectionRole.PREDICATE);
	var o = d.stringToId(o, HDT.DictionarySectionRole.OBJECT);

	if(s===-1 || p===-1 || o===-1) {
		return graph;
	}

	var it = hdt.triples.search(s,p,o);
	var count=0;
	while(it.hasNext()) {
		var triple = it.next();

		var subj = addNodeHash(graph.nodehash, graph.nodes, hdt, triple.subject, HDT.DictionarySectionRole.SUBJECT);
		var obj = addNodeHash(graph.nodehash, graph.nodes, hdt, triple.object, HDT.DictionarySectionRole.OBJECT);

		var pred = d.stringToId(triple.predicate, HDT.DictionarySectionRole.PREDICATE);

		graph.links.push({"source":subj, "target":obj, "predicate":pred, "predid":triple.predicate });
		count++;
		if(typeof limit==='number' && count>limit) {
			break;
		}
	}

	return graph;
}

function isType(obj, type) {
	if(typeof obj === 'undefined') {
		return false
	} else if(obj instanceof Array) {
		for (var i = 0; i < obj.length; i++) {
	        if (obj[i] === type) {
	            return true;
	        }
	    }
	    return false;
	} else {
		return obj === type;
	}
}

function EntityRenderer(hdt) {
	this.hdt = hdt;
	this.graph = { "nodes":[], "links":[], "nodehash":{} };
	this.nsubjects = hdt.dictionary.getNsubjects();

	this.init = function() {
		var d = this.hdt.dictionary;
		var t = this.hdt.triples;

		// Generate rdf:seq predicates
		this.rdfSeq = [];
		for(var i=0;i<10;i++) {
			var id = d.stringToId("http://www.w3.org/1999/02/22-rdf-syntax-ns#_"+i,1);
			if(id!=-1) {
				this.rdfSeq.push(id);
			}
		}

		// Get IDs of typical labels
		this.rdfType = d.stringToId("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", 1);
		this.seqType = d.stringToId("http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq", 2);
		this.rdfsLabel = d.stringToId("http://www.w3.org/2000/01/rdf-schema#label",1);
		this.foafName = d.stringToId("http://xmlns.com/foaf/0.1/name",1);
		this.foafPerson = d.stringToId("http://xmlns.com/foaf/0.1/Person",2);

		// Scan types
		var types = {};
		var typesSubjects = {};
		var typeit = t.search(0, this.rdfType, 0);
		while(typeit.hasNext()) {
			var type = typeit.next();

			if(typeof types[type.object] === 'undefined') {
				types[type.object] = 1;
			} else {
				types[type.object]++;
			}

			if(typeof typesSubjects[type.subject] === 'undefined') {
				typesSubjects[type.subject] = type.object;
			} else if(typesSubjects[type.subject] instanceof Array) {
				typesSubjects[type.subject].push(type.object);
			} else {
				typesSubjects[type.subject] = [ typesSubjects[type.subject], type.subject ];
			}
		}

		this.types = types;
		this.typesSubjects = typesSubjects;
	};

	this.init();

	this.addEntityHash = function(entry, role) {
		var hash = this.graph.nodehash;
		var nodes = this.graph.nodes;
		var hdt = this.hdt;
		var d = hdt.dictionary;
		var t = hdt.triples;
		var sh = hdt.dictionary.getNshared();
		var r = role;	// r in (SH, S, O)
		var roleId = role;	// roleId in (S, O)
		if(entry<=sh) {
			r= HDT.DictionarySectionRole.SHARED;
			roleId= HDT.DictionarySectionRole.SUBJECT;
		}
		var key = r+"_"+entry;
		var val = hash[key];
		if(typeof val !== 'undefined') {
			return val;
		} else {
			var obj = {};
			obj.hdtid = entry;
			obj.uri = d.idToString(entry, roleId);

			// Search label
			var it = t.search(entry, this.rdfsLabel);
			if(it.hasNext()) {
				obj.name = d.idToString(it.next().object, 2);
			} else {
				var it = t.search(entry, this.foafName);
				if(it.hasNext()) {
					obj.name = d.idToString(it.next().object, 2);
				} else {
					obj.name = obj.uri;
				}
			}

			// Remove double quotes from literals
			if(obj.name.charAt(0)=='"') {
				obj.name = obj.name.substring(1,obj.name.lastIndexOf('"'));
			}

			// Add all literal properties of resource
			if(entry<=this.nsubjects) {
				var it = t.search(entry);
				while(it.hasNext()) {
					var el = it.next();

					var o = d.idToString(el.object, 2);
					if(o.charAt(0)=='"') {
						var p = d.idToString(el.predicate, 1);
						obj[p] = o.substring(1,o.lastIndexOf('"'));
					}
				}
			}
			obj.group = r;
			obj.role = role;
			nodes.push(obj);
			hash[key] = obj;
			return obj;
		}
	};

	this.get = function(limit) {
		this.limit = limit;
		this.count=0;
		// Extract triples
		var itP = this.hdt.triples.search(0, this.rdfType, this.foafPerson);
		while(itP.hasNext()) {
			var tP = itP.next();

			var it = this.hdt.triples.search(tP.subject);
			while(it.hasNext()) {
				var triple = it.next();
				var s = this.hdt.dictionary.idToString(triple.subject,0);
				if(s.charAt(0)!='_') {
					this.addTriple(triple);
				}

				if(typeof this.limit==='number' && this.count>this.limit) {
					return this.graph;
				}
			}
		}

		return this.graph;
	};

	this.addTriple = function(triple) {
		var subjectType = this.typesSubjects[triple.subject];
		var objectType = this.typesSubjects[triple.object];

//		if(isType(objectType,this.seqType)) {
//			this.renderSeq(triple);

			// If both are resources
//		} else

//		if(subjectType && objectType && !isType(subjectType,this.seqType)) {
		if(subjectType) {
			this.addTripleInt(triple);
		}
	}

	this.addTripleInt = function(triple) {

		var o = this.hdt.dictionary.idToString(triple.object,2);
		if(
				//triple.predicate==this.rdfType || 
				o.charAt(0)=='"') {
			return;
		}

		var subj = this.addEntityHash(triple.subject, HDT.DictionarySectionRole.SUBJECT);
		var obj = this.addEntityHash(triple.object, HDT.DictionarySectionRole.OBJECT);

		var pred = this.hdt.dictionary.stringToId(triple.predicate, HDT.DictionarySectionRole.PREDICATE);

		this.graph.links.push({"source":subj, "target":obj, "predicate":pred, "predid":triple.predicate });
		this.count++;
	}

	this.renderSeq = function(triple) {
		for(var i=0;i<this.rdfSeq.length;i++) {
			var it = this.hdt.triples.search(triple.object, this.rdfSeq[i]);
			while(it.hasNext()) {
				var t = it.next();
				triple.object = t.object;
				this.addTripleInt(triple);

				if(typeof this.limit==='number' && this.count>this.limit) {
					return;
				}
			}
		}
	}
}

function getGeneralD3Graph(hdt, limit) {
	return new EntityRenderer(hdt).get(limit);
}


function addNodeHashSparql(hash, nodes, key) {
	var val = hash[key];
	if(typeof val !== 'undefined') {
		return val;
	} else {
		var obj = {};
		obj.name = key;
		nodes.push(obj);
		hash[key] = obj;
		return obj;
	}
}

function getD3GraphSparql(results, g, showLiterals) {
	var gr = g;
	if(typeof g === 'undefined') {
		gr = { "nodes":[], "links":[], "nodehash":{} };
	}

	if(!results instanceof store.rdf.api.Graph) {
		throw new Error("Only can render results of SPARQL CONSTRUCT query.");
	}

	results.forEach(function(triple,graph) {
		if(triple.object.token=='literal' && !showLiterals) {
			return;
		}
		var subj = addNodeHashSparql(gr.nodehash, gr.nodes, triple.subject.nominalValue);
		var obj = addNodeHashSparql(gr.nodehash, gr.nodes, triple.object.nominalValue);

		gr.links.push({"source":subj, "target":obj, "predicate":triple.predicate.nominalValue });
	});

	return gr;
}

function getD3GraphGremlin(pipe, hdt, g, limit) {
	var count=0;
	limit = typeof limit==='undefined'?Number.MAX_VALUE:limit;
	var gr = g;
	if(typeof g === 'undefined') {
		gr = { "nodes":[], "links":[], "nodehash":{} };
	}

	while(count<limit && pipe.hasNext()) {
		var el = pipe.next();
		var t = el.constructor.name;
		if(t==='HDTVertex') {
			var subj = addNodeHash(gr.nodehash, gr.nodes, hdt, el.id, el.role);
		} else if(t==='HDTEdge') {
			el = el.triple;
			var subj = addNodeHash(gr.nodehash, gr.nodes, hdt, el.subject, HDT.DictionarySectionRole.SUBJECT);
			var obj = addNodeHash(gr.nodehash, gr.nodes, hdt, el.object, HDT.DictionarySectionRole.OBJECT);

			gr.links.push({"source":subj, "target":obj, "predicate":el.predicate});
		} else {
			return gr;
		}
		count++;
	}
	return gr;
}