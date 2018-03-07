
(function(global) {
        "use strict";

var SUBJECT = 0;
var PREDICATE = 1;
var OBJECT = 2;
var SHARED = 3;


// TODO: Iter Map / Iter concat / Iter filter / IterLimit

function EmptyIterator() {
	this.hasNext = function(){return false}
	this.next = function(){}
}

function NumberIterator(min, max) {
	this.min = min;
	this.max = max;
}

NumberIterator.prototype.hasNext =function() {
	return this.min <= this.max;
}
NumberIterator.prototype.next =function() {
	return this.min++;
}

function IterConcat(a, b) {
	this.a = a;
	this.b = b;
}
//IterConcat.prototype = Object.create(Iterator.prototype);

IterConcat.prototype.hasNext = function() {
	if(this.a.hasNext()) {
		this.element = this.a.next();
		return true;
	}
	if(this.b.hasNext()) {
		this.element = this.b.next();
		return true;
	}
	return false;
}
IterConcat.prototype.next = function() {
	return this.element;
}

function IterMap(it, fun) {
	this.it = it;
	this.fun = fun;
}

IterMap.prototype.hasNext = function() {
	return this.it.hasNext();
};

IterMap.prototype.next = function() {
	var el = this.it.next();
	return this.fun(el);
};

function IterFilter(it, fun) {
	this.it = it;
	this.fun = fun;

	this.goNext();
}

IterFilter.prototype.hasNext = function() {
	return typeof this.elem !== 'undefined';
}

IterFilter.prototype.next = function() {
	var el = this.elem;
	this.goNext();
	return el;
}

IterFilter.prototype.goNext = function() {
	delete this.elem;
	while(this.it.hasNext()) {
		var el = this.it.next();
		if(this.fun(el)) {
			this.elem = el;
			return;
		}
	}
}


function IterLimit(it, lim) {
	this.it = it;
	this.lim = lim;
	this.count = 0;
}

IterLimit.prototype.hasNext = function() {
	return this.count<this.lim && this.it.hasNext();
}

IterLimit.prototype.next = function() {
	this.count++;
	return this.it.next();
}

function IterDedup(it, cmp) {
	this.it = it;
	this.cmp = typeof cmp==='function' ? cmp : function(a,b){ return a==b; };
	if(it.hasNext()) {
		this.last = this.el = it.next();
	}
}
IterDedup.prototype.hasNext = function() {
	return typeof this.el !=='undefined';
}
IterDedup.prototype.next = function() {
	var el = this.el;
	this.goNext();
	return el;
}
IterDedup.prototype.goNext = function() {
	this.last = this.el;
	delete this.el;
	while(this.it.hasNext()) {
		var el = this.it.next();
		if(!this.cmp(el,this.last)) {
			this.el=el;
			return;
		}
	}
}

function HDTEdgeIterator(graph, pattern, filter, limit, returnLit){
	var it = graph.hdt.triples.search(pattern.subject, pattern.predicate, pattern.object);

	// Filter literals
	if(pattern.object==0 && !returnLit) {
		it = new IterFilter(it, function(triple) {
				return !graph.isLiteral(triple.object);
			}
		);
	}

	// Filter properties
	if(typeof filter!=='undefined') {
		it = new IterFilter(it, filter);
	}

	// Limit number of results
	if(typeof limit !== 'undefined' && limit>0 && limit<Number.MAX_VALUE) {
		it = new IterLimit(it, limit);
	}

	// Convert to edges.
	return new IterMap(it, function(triple) {
		return new HDTEdge(graph, triple);
	});
}

function HDTVertexIterator(graph, limit) {
	this.graph = graph;
	var d = graph.hdt.dictionary;

	var it1 = new IterMap(new NumberIterator(1, d.getNshared()), function(id) { return new HDTVertex(graph, SHARED, id)});
	var it2 = new IterMap(new NumberIterator(d.getNshared()+1, d.getNsubjects()), function(id) { return new HDTVertex(graph, SUBJECT, id)});

	var it3 = new IterMap(
		new IterFilter(
			new NumberIterator(d.getNshared()+1, d.getNobjects()),
			function(id) { return graph.isLiteral(id); }
		),
		function(id) { return new HDTVertex(graph, OBJECT, id) }
	);

	var it = new IterConcat(new IterConcat(it1, it2),it3);

	if(typeof limit !== 'undefined' && limit>0 && limit < Number.MAX_VALUE) {
		it = new IterLimit(it, limit);
	}

	return it;
}
HDTVertexIterator.prototype.hasNext = function() {
	return this.it.hasNext();
}
HDTVertexIterator.prototype.next = function() {
	return this.it.next();
}





function GraphQuery(graph) {
	this.graph = graph;
	this.hs = [];
	this.hsNot = [];
	
	this.getHDT = function() {
	        return graph;
	    }
	
}
GraphQuery.prototype.has = function (key, predicate, value) {
	this.hs.push({"key":key,"value":value, "predicate":"equal"});
	return this;
}
GraphQuery.prototype.hasNot = function (key, predicate, value) {
	this.hsNot.push({"key":key,"value":value, "predicate":"notequal"});
	return this;
}
GraphQuery.prototype.interval= function (key, start, end) {
	this.hs.push({"key":key}); // Must have the key
	// TODO: comparison functions
	this.interval.push({key:key,start:start, end:end});
	return this;
}
GraphQuery.prototype.limit= function(limit) {
	this.lim = limit;
	return this;
}
GraphQuery.prototype.edges= function() {
	// TODO: Has
	// One has() = ?P? query. Several has() = Must do join.
	// If any has(), the vertex must be subject
	var pats = [];
	for(var i=0;i<this.hs.length;i++) {
		var c=this.hs[i];
		var d=this.graph.hdt.dictionary;
		var pred = c.key;
		if(typeof c.key==='string') {
			pred = d.stringToId(c.key, PREDICATE);
			if(pred<1) {
				return new EmptyIterator();
			}
		}
		var obj=0;
		if(c.value) {
			obj = d.stringToId(c.value, OBJECT);
			if(obj<1) {
				return new EmptyIterator();
			}
		}
		var res = this.graph.hdt.triples.search(0, pred, obj).numResults();
		pats.push({key:c.key, value:c.value, pred:pred, obj:obj, res:res});
	}

	// Sort by increasing number of results
	if(pats.length>1) {
		pats.sort(function(a,b){
			var x = a.res; var y = b.res;
			return ((x < y) ? -1 : ((x > y) ? 1 : 0));
		});
	}

	// FIXME: Optimize. Locate the range in ArrayY, and search the list of has() in order, then go down to objects and make sure the values match.
	if(pats.length>0) {
		// Get first as base
		var it = new HDTEdgeIterator(this.graph, {subject:0,predicate:pats[0].pred,object:pats[0].obj} , this.filter, Number.MAX_VALUE, true);

		// Filter the rest
		if(pats.length>1) {
			var triples = this.graph.hdt.triples;
			it = new IterFilter(it, function(e) {
				var subj = e.triple.subject;
				for(var i=1;i<pats.length;i++) {
					if(triples.search(subj, pats[i].pred, pats[i].obj).numResults()==0) {
						return false;
					}
				}
				// TODO: Filter intervals
				return true;
			});
		}

		it = new IterDedup(it, function(a,b) { return a.triple.subject==b.triple.subject });

		// Limit
		if(this.lim>0 && this.lim<Number.MAX_VALUE) {
			it = new LimitIt(it, this.lim);
		}
		return it;
	}

	// Base case, no has(), return everything
	return new HDTEdgeIterator(this.graph, {subject:0,predicate:0,object:0} , this.filter, this.lim);
}
GraphQuery.prototype.vertices= function () {

	if(this.hs.length>0) {
		return new IterMap(this.edges(), function(e){ return e.getVertex("out")});
	}

	// Whole graph
	return new HDTVertexIterator(this.graph, this.lim);
}



function VertexQuery(v) {
	this.v = v;
}

VertexQuery.prototype.direction = function (dir) {
	this.dir = dir;
	return this;
}
VertexQuery.prototype.interval = function (interval) {
	this.inter = interval;
	return this;
}
VertexQuery.prototype.has = function (has) {
	this.hs = has;
	return this;
}
VertexQuery.prototype.labels = function (labels) {
	this.lab = labels;
	return this;
}
VertexQuery.prototype.limit = function (limit) {
	this.lim = limit;
	return this;
}

VertexQuery.prototype.edges= function () {
	var inp, out;

	if(this.dir=="in" || this.dir=="both") {
		if(this.v.role==OBJECT || this.v.id<=this.v.graph.hdt.dictionary.getNshared()) {
			inp = this.getEdges({subject:0, predicate:0,object:this.v.id});
		}
	}

	if(this.dir=="out" || this.dir=="both") {
		if(this.v.role==SUBJECT || this.v.id<=this.v.graph.hdt.dictionary.getNshared()) {
			out = this.getEdges({subject:this.v.id,predicate:0,object:0});
		}
	}

	if(inp && out) {
		return new IterConcat(inp, out);
	} else if(inp) {
		return inp;
	} else if(out){
		return out;
	}
	return new EmptyIterator();
}

VertexQuery.prototype.vertices = function () {
	var inp, out;

	if(this.dir=="in" || this.dir=="both") {
		if(this.v.role==OBJECT || this.v.id<=this.v.graph.hdt.dictionary.getNshared()) {
			inp = new IterMap(this.getEdges({subject:0, predicate:0,object:this.v.id}), function(e){ return e.getVertex("out")} );
		}
	}

	if(this.dir=="out" || this.dir=="both") {
		if(this.v.role==SUBJECT || this.v.id<=this.v.graph.hdt.dictionary.getNshared()) {
			out = new IterMap(this.getEdges({subject:this.v.id,predicate:0,object:0}), function(e){ return e.getVertex("in")} );
		}
	}

	if(inp && out) {
		return new IterConcat(inp, out);
	} else if(inp) {
		return inp;
	} else if(out){
		return out;
	}
	return new EmptyIterator();
}

VertexQuery.prototype.getEdges=function(triple) {
	triple.predicate = this.getPredicateID();

	var filter;
	if(this.lab instanceof Array && this.lab.length>1) {
		var preds  = {};
		for(var i=0;i<this.lab.length;i++) {
			preds[this.v.graph.hdt.dictionary.stringToId(this.lab[i], PREDICATE)]=1;
		}
		filter = function(e) {
			return typeof preds[e.predicate] !== 'undefined';
		}
	}

	return HDTEdgeIterator(this.v.graph, triple, filter, this.lim);
}

VertexQuery.prototype.getPredicateID=function() {
	var pred = 0;
	if(typeof this.lab ==='number') {
		pred = this.lab;
	} else if(typeof this.lab ==='string') {
		pred = this.v.graph.hdt.dictionary.stringToId(this.lab, PREDICATE);
	} else if(this.lab instanceof Array && this.lab.length == 1 ) {
		pred = this.v.graph.hdt.dictionary.stringToId(this.lab[0], PREDICATE);
	}
	return pred;
}


function HDTVertex(graph, role, id) {
	this.graph = graph;
	this.role = role;
	this.id = id;
}

HDTVertex.prototype.query=function() {
	return new VertexQuery(this);
}

HDTVertex.prototype.getId= function() {
	var d = this.graph.hdt.dictionary
	var sh = d.getNshared();
	if(this.role==OBJECT && this.id>=sh) {
		return d.getNsubjects()+this.id;
	}
	return this.id;
}

HDTVertex.prototype.toString = function() {
	return "v["+this.getId()+"]";
	//return this.getId()+" / "+this.getLabel();
}

HDTVertex.prototype.getLabel = function() {
	if(this.str) {
		return this.str;
	}
	var r = this.role;
	if(r==SHARED) {
		r=SUBJECT;
	}
	this.str = this.graph.hdt.dictionary.idToString(this.id, r);
	return this.str;
}

HDTVertex.prototype.getProperty= function(key, value) {
	var graph = this.graph;
	var d = this.graph.hdt.dictionary;
	if(this.role!=SUBJECT && this.id>d.getNshared()) {
		return;
	}

	// Get id of property
	var predid = d.stringToId(key, PREDICATE);
	if(predid==-1 || predid==0) {
		return;
	}

	var objid=0;
	if(value) {
		var objid = d.stringToId(value, OBJECT);
		if(objid==-1) {
			return;
		}
	}

	// Search SP?
	var it = this.graph.hdt.triples.search(this.id, predid, objid);
	it = new IterFilter(it, function(triple) {
		return graph.isLiteral(triple.object);
	});

	// Convert to Strings.
	return new IterMap(it, function(t) { return d.idToString(t.object, OBJECT)});
}

HDTVertex.prototype.getPropertyMap = function(props) {
	// FIXME: Filter to only show the provided properties
	var graph = this.graph;
	var d = this.graph.hdt.dictionary;
	if(this.role!=SUBJECT && this.id>d.getNshared()) {
		return;
	}

	// Search S??
	var it = graph.hdt.triples.search(this.id);
	it = new IterFilter(it, function(triple) {
		return graph.isLiteral(triple.object);
	});

	return new IterMap(it, function(t) {
		return {subject:t.subject,key:d.idToString(t.predicate, PREDICATE), value:d.idToString(t.object, OBJECT)}}
	);
}

HDTVertex.prototype.getPropertyKeys= function() {
        var graph = this.graph;
        var d = this.graph.hdt.dictionary;
        if(this.role!=SUBJECT && this.id>d.getNshared()) {
                return [];
        }

	// Search S??
        var it = graph.hdt.triples.search(this.id);
        it = new IterFilter(it, function(triple) {
                return graph.isLiteral(triple.object);
        });

	// TODO: Method "list predicates for subject in HDT"
	var keys = [];
	var lastk = 0;
	while(it.hasNext()) {
		var el = it.next();
		if(el.predicate!=lastk) {
			var k = d.idToString(el.predicate, PREDICATE);
			lastk = el.predicate;
			keys.push(k);
		}
	}
	return keys;
}

HDTVertex.prototype._ = function() {
	return new GremlinPipeline(this.graph)._(this);
}


function GremlinGraph(hdt) {
	this.hdt = hdt;
	this.minLit = Number.MAX_VALUE;
	this.maxLit = 0;
	this.sh = hdt.dictionary.getNshared();
}

GremlinGraph.prototype.isLiteral=function(object) {
	if(object<=this.sh) {
		return false;
	}
	if(object>=this.minLit && object<=this.maxLit) {
		return true;
	}
	var str = this.hdt.dictionary.idToString(object, OBJECT);
	if(str.charAt(0)=='"') {
		this.minLit = Math.min(this.minLit, object);
		this.maxLit = Math.max(this.maxLit, object);
		return true;
	} else {
		return false;
	}
}

GremlinGraph.prototype.getVertex=function(id) {
	if(typeof id === 'number') {
		return this.getVertexID(id);
	} else {
		return this.getVertexStr(id);
	}
	// FIXME: Type vertex?
}

GremlinGraph.prototype.getVertexStr=function(str) {
	var d = this.hdt.dictionary;

	var id = d.stringToId(str, SUBJECT);
	if(id!=-1) {
		return new HDTVertex(this, SUBJECT, id);
	}

	id = d.stringToId(str, OBJECT);
	if(id!=-1) {
		return new HDTVertex(this, OBJECT, id);
	}
}

GremlinGraph.prototype.getVertexID=function(id) {
	var d = this.hdt.dictionary;
	if(id<=d.getNsubjects()) {
		return new HDTVertex(this, SUBJECT, id);
	} else if(id<=d.getNobjects()) {
		return new HDTVertex(this, OBJECT, id);
	}
}

GremlinGraph.prototype.getVertices=function(id) {
	return new HDTVertexIterator(this);
}

GremlinGraph.prototype.getEdges=function(id) {
	return new HDTEdgeIterator(this);
}

GremlinGraph.prototype.query=function(id) {
	return new GraphQuery(this);
}

GremlinGraph.prototype.v=function(key) {
	return new GremlinPipeline(this).v(key);
}

GremlinGraph.prototype.V=function(key, value) {
	return new GremlinPipeline(this).V(key,value);
}

GremlinGraph.prototype.E=function(key, value) {
	return new GremlinPipeline(this).E(key,value);
}

GremlinGraph.prototype._ = function() {
	return new GremlinPipeline(this);
}


function HDTEdge(graph, triple) {
	this.graph = graph;
	this.triple = triple;
}

HDTEdge.prototype.getVertex = function(dir) {
	if(dir=="out") {
		return new HDTVertex(this.graph, SUBJECT, this.triple.subject);
	} else if(dir=="in") {
		return new HDTVertex(this.graph, OBJECT, this.triple.object);
	}
}

HDTEdge.prototype.getLabel = function() {
	// FIXME: Cache?
	return this.graph.hdt.dictionary.idToString(this.triple.predicate, PREDICATE);
}

HDTEdge.prototype.getId = function() {
	return this.triple.posZ;
}

HDTEdge.prototype.toString = function() {
	return "E["+this.getId()+"]["+this.triple.subject+"-"+this.getLabel()+"->"+this.triple.object+"]";
	//return JSON.stringify(this.triple)+" / "+this.getLabel();
}

HDTEdge.prototype.asTriple = function() {
	var t = {};
	var d = this.graph.hdt.dictionary;
	t.subject = d.idToString(this.triple.subject, SUBJECT);
	t.predicate = d.idToString(this.triple.predicate, PREDICATE);
	t.object = d.idToString(this.triple.object, OBJECT);
	t.toString = function() {
		return this.subject+" "+this.predicate+" "+this.object;
	}
	return t;
}

HDTEdge.prototype._ = function() {
	return new GremlinPipeline(this.graph)._(this);
}






        // Enable module loading if available
        if (typeof module !== 'undefined' && module["exports"]) { // CommonJS
                module["exports"] = GremlinGraph;
        } else if (typeof define !== 'undefined' && define["amd"]) { // AMD
                define("GremlinGraph", [], function() { return GremlinGraph});
        } else { // Shim
                global["GremlinGraph"] = GremlinGraph;
        }

})(this);

