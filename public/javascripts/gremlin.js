(function(global) {
        "use strict";

function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
    ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function Iterator() {
}

Iterator.prototype.hasNext = function() {
	return false;
}
Iterator.prototype.next = function() {
	return undefined;
}


function SingleIterator(element) {
	Iterator.call(this);
	this.element = element;
	this.alive = true;
}
SingleIterator.prototype = Object.create(Iterator.prototype);

SingleIterator.prototype.hasNext = function() {
	return this.alive;
}
SingleIterator.prototype.next = function() {
	if(this.alive) {
		this.alive=false;
		return this.element;
	}
	return undefined;
}


function SingleExpandableIterator(el) {
	Iterator.call(this);
	this.t = el;
}
SingleExpandableIterator.prototype = Object.create(Iterator.prototype);

SingleExpandableIterator.prototype.hasNext = function() {
	return typeof this.t !== 'undefined';
}
SingleExpandableIterator.prototype.add = function(el) {
	this.t = el;
}
SingleExpandableIterator.prototype.next = function() {
	var el = this.t
	delete this.t;
	return el;
}

function ArrayIterator(arr) {
	Iterator.call(this);
	this.arr = arr;
	this.pos = 0;
}
ArrayIterator.prototype = Object.create(Iterator.prototype);

ArrayIterator.prototype.hasNext = function() {
	return this.pos<this.arr.length;
}
ArrayIterator.prototype.next = function() {
	return this.arr[this.pos++];
}

function HistoryIterator(it) {
	Iterator.call(this);
	this.it=it;
}
HistoryIterator.prototype = Object.create(Iterator.prototype);

HistoryIterator.prototype.hasNext = function() {
	return this.it.hasNext();
}
HistoryIterator.prototype.next= function() {
	this.last = this.it.next();
	return this.last;
}

function fluentGetAsPipes(metapipe) {
        var asPipes = [];
	var sub = metapipe.getPipes();
	for(var i=0;i<sub.length;i++) {
		var subPipe = sub[i];
            if (subPipe.type==='AsPipe') {
                asPipes.push(subPipe);
            }
            if (subPipe instanceof MetaPipe) {
                asPipes = asPipes.concat(fluentGetAsPipes(subPipe));
            }
        }
        return asPipes;
}

function fluentRemovePreviousPipes(pipeline, pos) {
	if(typeof pos !== 'string') {
		throw new Error("The backreference must be a pipe inserted with .as('name')");
	}
	var previousPipes = [];
	for (var i = pipeline.length - 1; i >= 0; i--) {
	    var pipe = pipeline[i];
	    if (pipe.type=='AsPipe' && pipe.name == pos) {
		break;
	    } else {
		previousPipes.unshift(pipe);
	    }
	}
	for (var i = 0; i < previousPipes.length; i++) {
	    pipeline.splice(pipeline.length - 1);
	}

	if (pipeline.length == 1)
	    pipeline.setStarts(pipeline.getStarts());

	return previousPipes;
}

function makePipeString() {
	var result = arguments[0].type;
	if(arguments.length > 1) {
            result = result + "(";
            for (var i=0;i<arguments.length-1;i++) {
                result = result + arguments[i]+ ",";
            }
            result = result + arguments[arguments.length-1]+ ")";
        }
        return result;
}

/**
* Base clase to all pipes. Equivalent to Pipe in gremlin's java implementation.
*/
function Pipe() {
	Iterator.call(this);
	this.available = false;
	this.pathEnabled = true;
	this.type='Pipe';
}
Pipe.prototype = Object.create(Iterator.prototype);

/**
* Set an iterator of S objects to the head (start) of the pipe.
*
* @param starts the iterator of incoming objects
*/
Pipe.prototype.setStarts=function(starts){
        if (starts instanceof Pipe) {
            this.starts = starts;
        } else {
            this.starts = new HistoryIterator(starts);
        }
    }


/**
* Returns the transformation path to arrive at the current object of the pipe.
*
* @return a List of all of the objects traversed for the current iterator position of the pipe.
*/
Pipe.prototype.getCurrentPath=function(){
        if (this.pathEnabled) {
            var pathElements = this.getPathToHere();
            //if (this instanceof TransformPipe) {
            if (this.currentEnd) {
                pathElements.push(this.currentEnd);
            } else if (this.type!=='SideEffectPipe' && this.type!=='FilterPipe') {
                var size = pathElements.length;
                if (size == 0 || pathElements[size - 1] != this.currentEnd) {
                    // do not repeat filters or side-effects as they dup the object
                    // this is for backwards compatibility to before TransformPipe interface
                    pathElements.push(this.currentEnd);
                }
            }
            return pathElements;
        } else {
            throw new Error("Path calculations are not enabled");
        }
    }

/**
* A pipe may maintain state. Reset is used to remove state.
* The general use case for reset() is to reuse a pipe in another computation without having to create a new Pipe object.
* An implementation of this method should be recursive whereby the starts (if a Pipe) should have this method called on it.
*/
Pipe.prototype.reset=function(){
       if (this.starts instanceof Pipe)
            this.starts.reset();

        delete this.nextEnd;
        delete this.currentEnd;
        this.available = false;
	this.pathEnabled = true;
}

Pipe.prototype.hasNext=function() {
        if (this.available)
            return true;
        else {
            try {
                this.nextEnd = this.processNextStart();
                return (this.available = (typeof this.nextEnd!=='undefined'));
            } catch (e) {
                return (this.available = false);
            }
        }
}

Pipe.prototype.next=function() {
        if (this.available) {
            this.available = false;
            return (this.currentEnd = this.nextEnd);
        } else {
            return (this.currentEnd = this.processNextStart());
        }
}

Pipe.prototype.enablePath=function(enable) {
        this.pathEnabled = enable;
        if (this.starts instanceof Pipe)
            this.starts.enablePath(enable);
	return this;
    }

Pipe.prototype.toString=function() {
        return makePipeString(this);
}

// Abstract
Pipe.prototype.processNextStart=function() {
}

Pipe.prototype.getPathToHere=function() {
        if (this.starts instanceof Pipe) {
            return this.starts.getCurrentPath();
        } else if (this.starts instanceof HistoryIterator) {
            return [this.starts.last];
        } else {
            return [];
        }
}

function PipeHelperCounter(iterator, max) {
	var count=0;
	if(typeof max === 'undefined') {
		max = Number.MAX_VALUE;
	}
	while (count<max && iterator.hasNext()) {
		iterator.next();
		count++;
	}
	return count;
}


function IdentityPipe(arg) {
	Pipe.call(this);
	this.type = 'IdentityPipe';
	if(!arg) {
		this.inp=true;
		return;
	} else if(arg instanceof Array) {
		this.arr = arg;
		this.pos = 0;
	} else if(arg.hasNext && arg.next) {
		this.it = arg;
	} else {
		this.el = arg;
	}
}
IdentityPipe.prototype = Object.create(Pipe.prototype);

IdentityPipe.prototype.processNextStart=function() {
	// TODO: Separate?
	if(this.inp && this.starts.hasNext()) {
		return this.starts.next();
	}
	if(this.arr && this.pos<this.arr.length) {
		return this.arr[this.pos++];
	}
	if(this.it && this.it.hasNext()) {
		return this.it.next();
	}
	if(this.el) {
		var it = this.el;
		delete this.el;
		return it;
	}
}

IdentityPipe.prototype.getCurrentPath=function() {
	if(this.arr) {
		return this.arr.clone();
	} else if(this.el) {
		return [ this.el ];
	} else {
		return [];
	}
}

function CountPipe(){
	Pipe.call(this);
	this.type = 'CountPipe';
	this.counter = 0;
}
CountPipe.prototype = Object.create(Pipe.prototype);

CountPipe.prototype.processNextStart=function() {
        var s = this.starts.next();
        this.counter++;
        return s;
    }

CountPipe.prototype.getSideEffect=function() {
        return this.counter;
    }

CountPipe.prototype.reset=function() {
        this.counter = 0;
        Pipe.prototype.reset.call(this);
    }






function QueryPipe() {
	Pipe.call(this);
	this.type = 'QueryPipe';
	this.hasContainers = [];
	this.intervalContainer = [];
	this.lowRange = 0;
	this.highRange = Number.MAX_VALUE;
	this.count = 0;
	this.currentIterator = new Iterator();
}
QueryPipe.prototype = Object.create(Pipe.prototype);

QueryPipe.prototype.addHasContainer=function(container) {
        this.hasContainers.push(container);
    }

QueryPipe.prototype.addIntervalContainer=function(container) {
        this.intervalContainers.push(container);
    }

QueryPipe.prototype.setHighRange=function(highRange) {
        this.highRange = (highRange == Number.MAX_VALUE) ? Number.MAX_VALUE : highRange + 1;
    }

QueryPipe.prototype.setLowRange=function(lowRange) {
        this.lowRange = (lowRange < 0) ? 0 : lowRange;
    }

QueryPipe.prototype.reset=function() {
        Pipe.prototype.reset.call(this);
        this.currentIterator = new Iterator();
        this.count = 0;
    }

/*QueryPipe.prototype.toString=function() {
        StringBuilder extra = new StringBuilder();
        if (undefined != this.hasContainers && this.hasContainers.size() > 0)
            extra.append("has");
        if (undefined != this.intervalContainers && this.intervalContainers.size() > 0) {
            if (extra.length() != 0) extra.append(",");
            extra.append("interval");
        }
        if (this.lowRange != 0 || highRange != Number.MAX_VALUE) {
            if (extra.length() != 0) extra.append(",");
            extra.append("range:[");
            extra.append(this.lowRange);
            extra.append(",");
            extra.append(this.highRange - 1);
            extra.append("]");
        }
        if (extra.length() != 0) extra.append(",");
        extra.append(this.elementClass.getSimpleName().toLowerCase());
        return extra.toString();
    }
*/



function GraphQueryPipe(querytype) {
	QueryPipe.call(this);
	this.type = 'GraphQueryPipe';
	this.querytype = querytype;
}
GraphQueryPipe.prototype = Object.create(QueryPipe.prototype);

GraphQueryPipe.prototype.processNextStart=function() {
        while (true) {
            if (this.count < this.highRange && this.currentIterator && this.currentIterator.hasNext()) {
                this.count++;
                var e = this.currentIterator.next();
                if (this.count > this.lowRange)
                    return e;
            } else if(this.starts.hasNext()){
                var graph = this.starts.next();
                var query = graph.query();
                if (this.hasContainers instanceof Array) {
		    for (var i=0;i<this.hasContainers.length;i++) {
			var hasContainer = this.hasContainers[i];
                        query = query.has(hasContainer.key, hasContainer.predicate, hasContainer.value);
                    }
                }
                if (this.intervalContainers instanceof Array) {
		    for (var i=0;i<this.intervalContainers.length;i++) {
			var hasContainer = this.intervalContainers[i];
                        query = query.interval(intervalContainer.key, intervalContainer.startValue, intervalContainer.endValue);
                    }
                }
                if (this.highRange != Number.MAX_VALUE) {
                    query = query.limit(this.highRange - this.count);
                }

                this.currentIterator = this.querytype=="vertex" ? query.vertices() : query.edges();
            } else {
		return;
	    }
        }
    }


GraphQueryPipe.prototype.reset=function() {
        QueryPipe.prototype.reset.call(this); // Super
}

/**
     * Construct a new VertexQuery pipe that wraps an underlying Blueprints VertexQuery object.
     * Given the optional nature of many of the parameters, note the "wildcard" settings for each parameter.
     *
     * @param resultingElementClass this must be either Vertex.class or Edge.class (anything else will throw an IllegalArgumentException)
     * @param direction             this must be a legal direction representing the direction of the edge.
     * @param hasContainers         this must be a collection of 'has'-filters (i.e. property filters). Provide an empty list if no such filters are to be applied.
     * @param intervalContainers    this must be a collection of 'interval'-filters (i.e. property filters within a range). Provide an empty list if no such filters are to be applied.
     * @param branchFactor          the branch factor for a particular vertex (determines the limit() of the VertexQuery)
     * @param lowRange              this must be a long value representing the low range of elements to emit
     * @param highRange             this must be a long value representing the high range of elements to emit
     * @param labels                this is a list of Strings representing the edge label filters to apply. Do not provide any Strings if no such filtering is desired.
     */
function VertexQueryPipe(querytype, direction, containers, intervalContainers, branchFactor, lowRange, highRange, labels) {
	QueryPipe.call(this);
	this.type='VertexQueryPipe';
	this.querytype=querytype;
        this.direction = direction;
        if (containers instanceof Array) {
	    for(var i=0;i<containers.length;i++) {
		var container = containers[i];
                QueryPipe.prototype.addHasContainer.call(this, container);
            }
        }
        if (intervalContainers instanceof Array) {
	    for(var i=0;i<intervalContainers.length;i++) {
		var container = intervalContainers[i];
                QueryPipe.prototype.addIntervalContainer.call(this,container);
            }
        }
        this.branchFactor = branchFactor;
        this.setLowRange(lowRange);
        this.setHighRange(highRange);
        this.labels = labels;
    }
VertexQueryPipe.prototype = Object.create(QueryPipe.prototype);

VertexQueryPipe.prototype.setDirection=function(direction) {
        this.direction = direction;
    }

VertexQueryPipe.prototype.labels=function(labels) {
        this.labels = labels;
    }

VertexQueryPipe.prototype.setBranchFactor=function(branchFactor) {
        this.branchFactor = branchFactor;
    }

/*VertexQueryPipe.prototype.toString=function() {
        return (this.branchFactor == Number.MAX_VALUE) ?
                PipeHelper.makePipeString(this, this.direction.name().toLowerCase(), Arrays.asList(this.labels), super.toString()) :
                PipeHelper.makePipeString(this, this.direction.name().toLowerCase(), "branch:" + branchFactor, Arrays.asList(this.labels), super.toString());
    }*/

VertexQueryPipe.prototype.processNextStart=function() {
        while (true) {
            if (this.count < this.highRange && this.currentIterator && this.currentIterator.hasNext()) {
                this.count++;
                var e = this.currentIterator.next();
                if (this.count > this.lowRange)
                    return e;
            } else if(this.starts.hasNext()){
                var vertex = this.starts.next();
                var query = vertex.query();
                query = query.direction(this.direction);
                if (typeof this.labels!=='undefined')
                    query = query.labels(this.labels);
		if (this.hasContainers instanceof Array) {
		    for(var i=0;i<this.hasContainers.length;i++) {
			var container = this.hasContainers[i];
                        query = query.has(container.key, container.predicate, container.value);
                    }
                }
		if (this.intervalContainers instanceof Array) {
		    for(var i=0;i<this.intervalContainers.length;i++) {
			var container = this.intervalContainers[i];
                        query = query.interval(container.key, container.startValue, container.endValue);
                    }
                }
                if (this.branchFactor == Number.MAX_VALUE) {
                    if (this.highRange != Number.MAX_VALUE) {
                        var temp = this.highRange - this.count;
                        query = temp > 0 ? query.limit(temp) : query;
                    }
                } else {
                    if (this.highRange == Number.MAX_VALUE) {
                        query = query.limit(this.branchFactor);
                    } else {
                        var temp = this.highRange - this.count;
                        query = query.limit(temp < this.branchFactor ? temp : this.branchFactor);
                    }
                }
                this.currentIterator = this.querytype=="vertex" ? query.vertices() : query.edges();
            } else {
		return;
	    }
        }
    }

VertexQueryPipe.prototype.reset=function() {
        QueryPipe.prototype.reset.call(this); // Super
}

function EdgesVerticesPipe(dir) {
	Pipe.call(this);
	this.type = 'EdgesVerticesPipe';
	this.dir = dir;
}
EdgesVerticesPipe.prototype = Object.create(Pipe.prototype);

EdgesVerticesPipe.prototype.processNextStart=function() {
        if (typeof this.nextVertex !== 'undefined') {
            var temp = this.nextVertex;
		delete this.nextVertex;
            return temp;
        } else {
            if (this.dir=="both") {
                var edge = this.starts.next();
                this.nextVertex = edge.getVertex("in");
                return edge.getVertex("out");
            } else {
                return this.starts.next().getVertex(this.dir);
            }
        }
}

function MetaPipe() {
	Pipe.call(this);
	this.type = 'MetaPipe';
	this.pipes = [];
}
MetaPipe.prototype = Object.create(Pipe.prototype);

MetaPipe.prototype.getPipes = function() {
	return [];
}

MetaPipe.prototype.toString = function() {
	var res = Pipe.prototype.toString.call(this);
	if(this.pipes) {
		res = res + " [ ";
		var p = this.pipes;
		var l = p.length;
		for(var i=0;i<l-1;i++) {
			res = res + p[i].toString()+", ";
		}
		res = res + p[l-1].toString()+" ] ";
	}
	return res;
}


function Pipeline(pipes) {
	MetaPipe.call(this);
	this.type = 'PipeLine';
	if(pipes instanceof Array) {
		this.pipes = pipes;
	} else {
		this.pipes = [pipes];
	}
	this.setPipes(this.pipes);
}
Pipeline.prototype = Object.create(MetaPipe.prototype);

Pipeline.prototype.addPipe = function(pipe) {
	this.pipes.push(pipe);
	this.setPipes(this.pipes);
}


Pipeline.prototype.setStarts=function(starts) {
        this.starts = starts;
        this.startPipe.setStarts(starts);
    }

Pipeline.prototype.setPipes=function(pipes) {
        var pipelineLength = pipes.length;
        this.startPipe = pipes[0];
        this.endPipe = pipes[pipelineLength - 1];
        for (var i = 1; i < pipelineLength; i++) {
            pipes[i].setStarts(pipes[i - 1]);
        }
}

    /**
     * Determines if there is another object that can be emitted from the pipeline.
     *
     * @return true if an object can be next()'d out of the pipeline
     */
Pipeline.prototype.hasNext=function() {
        return this.endPipe.hasNext();
    }

Pipeline.prototype.getCurrentPath=function() {
        if (this.pathEnabled)
            return this.endPipe.getCurrentPath();
        else
            throw new Error(Pipe.NO_PATH_MESSAGE);
    }

Pipeline.prototype.enablePath=function(enable) {
        this.pathEnabled = enable;
        this.endPipe.enablePath(enable);
	return this;
    }

    /**
     * Get the number of pipes in the pipeline.
     *
     * @return the pipeline length
     */
Pipeline.prototype.size=function() {
        return this.pipes.size();
    }

Pipeline.prototype.reset=function() {
        this.endPipe.reset();
    }

Pipeline.prototype.getPipes=function() {
        return this.pipes;
    }

Pipeline.prototype.getStarts=function() {
        return this.starts;
    }

Pipeline.prototype.remove=function(index) {
        return this.pipes.remove(index);
    }

Pipeline.prototype.get=function(index) {
        return this.pipes.get(index);
    }

Pipeline.prototype.equals=function(object) {
        //return (object instanceof Pipeline) && PipeHelper.areEqual(this, (Pipeline) object);
    }

Pipeline.prototype.count=function() {
        return PipeHelperCounter(this);
    }

Pipeline.prototype.iterate=function(max) {
        return PipeHelperCounter(this, max);
    }

Pipeline.prototype.next=function(number) {
	if(typeof number ==='number') {
		var list = [];
		var count=0;
		while(count<number && this.endPipe.hasNext() ) {
			var el = this.endPipe.next();
			list.push(el);
			count++;
		}
		return list;
	}
	return this.endPipe.next();
   }

Pipeline.prototype.toList=function() {
        return this.fill([]);
    }

Pipeline.prototype.fill=function(arr) {
	while(this.hasNext()) {
		var el = this.next();
		arr.push(el);
	}
        return arr;
    }


function optimizePipelineForQuery(pipeline, pipe) {
        if (!optimizePipelineForGraphQuery(pipeline, pipe))
            if (!optimizePipelineForVertexQuery(pipeline, pipe))
                pipeline.addPipe(pipe);
        return pipeline;
    }

function optimizePipelineForVertexQuery(pipeline, pipe) {
        var queryPipe;
        for (var i = pipeline.pipes.length - 1; i > 0; i--) {
            var temp = pipeline.pipes[i];
            if (temp.type === 'VertexQueryPipe' ) {
                queryPipe = temp;
                break;
            } else if (temp.type !== 'IdentityPipe') {
                break;
	    }
        }

        if (queryPipe) {
            if (pipe.type==='EdgesVerticesPipe') {
                if (queryPipe.querytype==='vertex')
                    return false;
                queryPipe.querytype = 'vertex';
            } else if (pipe.type==='VerticesVerticesPipe') {
                if (queryPipe.querytype==='vertex')
                    return false;
                queryPipe.setDirection(pipe.direction);
                queryPipe.setLabels(pipe.labels);
                queryPipe.setBranchFactor(pipe.branchFactor);
            } else if (pipe.type==='VerticesEdgesPipe') {
                if (queryPipe.querytype==='vertex')
                    return false;
                queryPipe.querytype='edge';
                queryPipe.setDirection(pipe.direction);
                queryPipe.setLabels(pipe.labels);
                queryPipe.setBranchFactor(pipe.branchFactor);
            } else if (pipe.type==='PropertyFilterPipe') {
                if (queryPipe.querytype==='vertex')
                    return false;
                queryPipe.addHasContainer({key:pipe.key, predicate:pipe.pred, value:pipe.value});
            } else if (pipe.type==='IntervalFilterPipe') {
                if (queryPipe.querytype==='vertex')
                    return false;
                queryPipe.addIntervalContainer({key:pipe.key, start:pipe.start, end:pipe.end, lessthan:pipe.lessthan, greaterEqual:pipe.greaterEqual});
            } else if (pipe.type==='RangeFilterPipe') {
                queryPipe.setLowRange(pipe.low);
                queryPipe.setHighRange(pipe.high);
            }
            pipeline.addPipe(new IdentityPipe());
            return true;
        } else {
            return false;
        }
    }

function optimizePipelineForGraphQuery(pipeline, pipe) {
        var queryPipe;
        for (var i = pipeline.pipes.length - 1; i > 0; i--) {
            var temp = pipeline.pipes[i];
            if (temp.type==='GraphQueryPipe') {
                queryPipe = temp;
                break;
            } else if (temp.type !== 'IdentityPipe') {
                break;
	    }
        }

        if (queryPipe) {
            if (pipe.type==='PropertyFilterPipe') {
                queryPipe.addHasContainer({key:pipe.key, predicate:pipe.pred, value:pipe.value});
            } else if (pipe.type==='IntervalFilterPipe') {
                queryPipe.addIntervalContainer({key:pipe.key, start:pipe.start, end:pipe.end, lessthan:pipe.lessthan, greaterEqual:pipe.greaterEqual});
		// TODO: Implement interval in HDT
		return false;
            } else if (pipe.type==='RangeFilterPipe') {
                queryPipe.setLowRange(pipe.low);
                queryPipe.setHighRange(pipe.high);
            }
            pipeline.addPipe(new IdentityPipe());
            return true;
        } else {
            return false;
        }
    }




function GremlinStartPipe(start) {
	IdentityPipe.call(this,start);
	this.type = 'GremlinStartPipe';
	//this.startIsGraph = (start instanceof Graph);
}
GremlinStartPipe.prototype = Object.create(IdentityPipe.prototype);

GremlinStartPipe.prototype.getCurrentPath = function() {
	 return this.startIsGraph ? [] : IdentityPipe.prototype.getCurrentPath.call(this);
}


function GremlinPipeline(first) {
	this.type = 'GremlinPipeline';

	this.first = first;
	var firstPipe = new GremlinStartPipe(first);
	Pipeline.call(this, firstPipe);
	this.setStarts(new SingleIterator(first));
	this.optimize = true;
	this.pathEnabled = true;
}
GremlinPipeline.prototype = Object.create(Pipeline.prototype);

GremlinPipeline.prototype.add=function(pipe) {
    this.addPipe(pipe);
    return this;
}

// Get a single vertex
GremlinPipeline.prototype.v=function(id) { // TODO: Branchfactor
	return new GremlinPipeline(this.first.getVertex(id));
}

// Outcoming vertices
GremlinPipeline.prototype.out=function(labels) { // TODO: Branchfactor
        return this.add(new VertexQueryPipe("vertex", "out", undefined, undefined, this.branchFactor, 0, Number.MAX_VALUE, labels));
}

// Incoming vertices
GremlinPipeline.prototype.in=function(labels) { // TODO: Branchfactor
        return this.add(new VertexQueryPipe("vertex", "in", undefined, undefined, this.branchFactor, 0, Number.MAX_VALUE, labels));
}

// Incoming and outcoming vertices
GremlinPipeline.prototype.both=function(labels) { // TODO: Branchfactor
        return this.add(new VertexQueryPipe("vertex", "both", undefined, undefined, this.branchFactor, 0, Number.MAX_VALUE, labels));
                this.add(new BothPipe(branchFactor, labels));
}

GremlinPipeline.prototype.outV=function() {
	return this.add(new EdgesVerticesPipe("out"));
}

GremlinPipeline.prototype.inV=function() {
	return this.add(new EdgesVerticesPipe("in"));
}

GremlinPipeline.prototype.bothV=function() {
	return this.add(new EdgesVerticesPipe("both"));
}

GremlinPipeline.prototype.inE=function(labels) { // TODO: Branchfactor
        return this.add(new VertexQueryPipe("edge", "in", undefined, undefined, this.branchFactor, 0, Number.MAX_VALUE, labels));
}

GremlinPipeline.prototype.outE=function(labels) { // TODO: Branchfactor
        return this.add(new VertexQueryPipe("edge", "out", undefined, undefined, this.branchFactor, 0, Number.MAX_VALUE, labels));
}

GremlinPipeline.prototype.bothE=function(labels) { // TODO: Branchfactor
        return this.add(new VertexQueryPipe("edge", "both", undefined, undefined, this.branchFactor, 0, Number.MAX_VALUE, labels));
}

// All vertices
GremlinPipeline.prototype.V=function(key, value) {
	var b = this.add(new GraphQueryPipe("vertex"));
	if(key) {
		b=b.has(key,value);
	}
	return b;
}

// All edges
GremlinPipeline.prototype.E=function(key, value) {
	var b = this.add(new GraphQueryPipe("edge"));
	if(key) {
		b=b.has(key,value);
	}
	return b;
}

// Get id of element
GremlinPipeline.prototype.id=function() {
	var o = new Pipe();
	o.type = 'IdPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.starts.next().getId();
		}
	}
	return this.add(o);
}

// Get label of element
GremlinPipeline.prototype.label=function() {
	var o = new Pipe();
	o.type = 'LabelPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.starts.next().getLabel();
		}
	}
	return this.add(o);
}

// Call the toString() method of each element
GremlinPipeline.prototype.string=function() {
	var o = new Pipe();
	o.type = 'StringPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.starts.next().toString();
		}
	}
	return this.add(o);
}

// For each id received from the pipe, return the vertices associated
GremlinPipeline.prototype.idVertex=function() {
	var o = new Pipe();
	o.type = 'IdVertexPipe';
	o.graph = this.first;
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.graph.getVertex(this.starts.next());
		}
	}
	return this.add(o);
}

// Submit each key-value pair of the properties of supplied vertices.
GremlinPipeline.prototype.map=function(props) {
	var o = new Pipe();
	o.type = 'MapPipe';
	o.processNextStart=function() {
		if(this.it && this.it.hasNext()) {
			return this.it.next();
		}
		delete this.it;
		while(this.starts.hasNext()) {
			this.it = this.starts.next().getPropertyMap(props);
			if(this.it.hasNext()) {
				return this.it.next();
			} else {
				delete this.it;
			}
		}
	}
	return this.add(o);
}

// List of keys
GremlinPipeline.prototype.keys=function() {
	var o = new Pipe();
	o.type = 'KeysPipe';
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			return this.starts.next().getPropertyKeys();
		}
	}
	return this.add(o);
}

// Call fun() using as arg each element that passes through the pipe
GremlinPipeline.prototype.sideEffect=function(fun) {
	var o = new Pipe();
	o.type = 'SideEffectPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var it = this.starts.next();
			typeof fun ==='function' ? fun(it) : eval(fun);
			return it;
		}
	}
	o.getCurrentPath = function(){
		return this.starts.getCurrentPath();
	}
	return this.add(o);
}

// Filter only those elements where fun(el) returns true.
GremlinPipeline.prototype.filter=function(fun) {
	var o = new Pipe();
	o.type = 'FilterPipe';
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			var it = this.starts.next();
			var res = typeof fun ==='function' ? fun(it) : eval(fun);
			if(res) {
				return it;
			}
		}
	}
	o.getCurrentPath = function(){
		return this.starts.getCurrentPath();
	}
	return this.add(o);
}

// Transform each element using the function
GremlinPipeline.prototype.transform=function(fun) {
	var o = new Pipe();
	o.type = 'TransformPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var it = this.starts.next();
			return typeof fun ==='function' ? fun(it) : eval(fun);
		}
	}
	return this.add(o);
}

GremlinPipeline.prototype.step=function(fun) {
	var o = new Pipe();
	o.type = 'StepPipe';
	o.processNextStart=function() {
		return fun(this.starts);
	}
	return this.add(o);
}

// Filter only those vertices that have a property
GremlinPipeline.prototype.has=function(key, value, pred) {
	var o = new Pipe();
	o.type = 'PropertyFilterPipe';
	o.key = key;
	o.value = value;
	o.pred = pred;
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			var el = this.starts.next();
			var it = el.getProperty(this.key,this.value);
			if(it && it.hasNext()) {
				return el;
			}
		}
	}
	return this.optimize ? optimizePipelineForQuery(this, o) : this.add(o);
}

// Get property of a vertex
GremlinPipeline.prototype.property=function(prop) {
	var o = new Pipe();
	o.type = 'PropertyPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.starts.next().getProperty(prop);
		}
	}
	return this.add(o);
}

// Gather greedily as much elements as possible from previous stages into an array, using fun() for each element if supplied, and glob before emiting the list itself
GremlinPipeline.prototype.gather=function(fun,glob) {
	var o = new Pipe();
	o.type = 'GatherPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var arr = [];
			while(this.starts.hasNext()) {
				var it = this.starts.next();
				arr.push( typeof fun ==='function' ? fun(it) : (typeof fun ==='string' ? eval(fun) : it));
			}
			var it = arr;
			return typeof glob==='function' ? glob(it) : (typeof glob ==='string' ? eval(glob) : it);
		}
	}
	return this.add(o);
}

GremlinPipeline.prototype.scatter=function() {
	var o = new Pipe();
	o.type = 'ScatterPipe';
	o.iterator = new Iterator();
	o.processNextStart=function() {
		if(this.iterator.hasNext()) {
			return this.iterator.next();
		}

		while(this.starts.hasNext()) {
			var it = this.starts.next();
			if(it instanceof Array && it.length>0) {
				this.iterator = new ArrayIterator(it);
				return this.iterator.next();
			} else if(it.hasNext && it.hasNext()) {
				this.iterator = it;
				return it.next();
			} else {
				console.error("Unrecognized element, expecting array or iterator");
			}
		}
	}
	return this.add(o);
}

// Gather greedily as much elements as possible from previous stages into an array, using fun() for each element if supplied, and glob before emiting the list itself
GremlinPipeline.prototype.shuffle=function(fun) {
	var o = new Pipe();
	o.type = 'ShufflePipe';
	o.arr = [];
	o.count = 0;
	o.processNextStart=function() {
		if(this.count==0) {
			while(this.starts.hasNext()) {
				var it = this.starts.next();
				this.arr.push( typeof fun ==='function' ? fun(it) : (typeof fun ==='string' ? eval(fun) : it));
			}
			// Randomize
			shuffle(this.arr);
		}
		if(this.count<this.arr.length) {
			return this.arr[this.count++];
		}
	}
	return this.add(o);
}

// Store elements that pass lazily into suppled array, using fun() for each element if supplied, and glob with the array when returning.
GremlinPipeline.prototype.store=function(fun,glob) {
	var o = new Pipe();
	o.type = 'StorePipe';
	o.arr = [];
	o.isGreedy = false;
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var it = this.starts.next();
			this.arr.push( typeof fun ==='function' ? fun(it) : (typeof fun ==='string' ? eval(fun) : it));
			return it;
		}
	}
	o.getSideEffect=function() {
		var it = this.arr;
		return typeof glob==='function' ? glob(it) : (typeof glob ==='string' ? eval(glob) : it);
	}
	return this.add(o);
}

GremlinPipeline.prototype.saveMap=function(fun,map) {
	var o = new Pipe();
	o.type = 'SaveMapPipe';
	o.map = typeof map !== 'undefined' ? map : {};
	o.isGreedy = false;
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var it = this.starts.next();
			var key = typeof fun ==='function' ? fun(it) : (typeof fun ==='string' ? eval(fun) : it);
			this.map[key]=value;
			return it;
		}
	}
	o.getSideEffect=function() {
		return this.map;
	}
	return this.add(o);

}

// Remove duplicates using an object as a map. An optionally provided function gets the key to be used in the map.
GremlinPipeline.prototype.dedup=function(fun) {
	var o = new Pipe();
	o.type = 'DedupPipe';
	o.map = {};
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			var it = this.starts.next();
			var key = typeof fun ==='function' ? fun(it) : (typeof fun ==='string' ? eval(fun) : it.toString());
			if(!this.map[key]) {
				this.map[key]=1;
				return it;
			}
		}
	}
	o.getSideEffect=function() {
		return this.map();
	}
	return this.add(o);
}

// Remove duplicates comparing only to the previous. An optionally provided function gets the key to be used to compare
GremlinPipeline.prototype.dedupSeq=function(fun) {
	var o = new Pipe();
	o.type = 'DedupSeqPipe';
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			var it = this.starts.next();
			var key = typeof fun ==='function' ? fun(it) : (typeof fun ==='string' ? eval(fun) : it.toString());

			if(!this.last || key!=this.last) {
				this.last = key;
				return it;
			}
		}
	}
	return this.add(o);
}

// Equivalent to Gremlin Groovy's [ini..end]
GremlinPipeline.prototype.range=function(low, high) {
	var o = new Pipe();
	o.type = 'RangeFilterPipe';
	o.low = low;
	o.high = high;
	o.count = 0;
	o.processNextStart=function() {
		while(this.count<this.low && this.starts.hasNext()) {
			this.starts.next();
			this.count++;
		}
		if(this.count<this.high && this.starts.hasNext()) {
			this.count++;
			return this.starts.next();
		}
	}
	return this.add(o);
}

GremlinPipeline.prototype.interval=function(key, start, end, lessthan, greaterEqual) {
	var o = new Pipe();
	o.type = 'IntervalFilterPipe';
	o.key = key;
	o.start = start;
	o.end = end;
	o.lessthan = lessthan;
	o.greaterEqual = greaterEqual;
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			var el = this.starts.next();
			var propit = el.getProperty(this.key);
			if(propit.hasNext()) {
				var prop = propit.next();
				if(prop.length>2 && prop.charAt(0)=='"' && prop.charAt(prop.length-1)=='"') {
					prop = prop.substring(1,prop.length-1);
				}

				var ge = typeof this.greaterEqual ==='function' ? this.greaterEqual(this.start, prop) : this.start <= prop;
				var lt = typeof this.lessthan ==='function' ? this.lessthan(prop, this.end) : prop < this.end;

				if(ge && lt) {
					return el;
				}
			}
		}
	}
	//return this.optimize ? optimizePipelineForQuery(this, o) : this.add(o);
	return this.add(o);
}
// Name a pipe
GremlinPipeline.prototype.as=function(pos) {
	var o = new Pipe();
	o.type = 'AsPipe';
	o.name = pos;
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.starts.next();
		}
	}
	return this.add(o);
}

// Edge as RDF triple
GremlinPipeline.prototype.triple=function() {
	var o = new Pipe();
	o.type = 'TriplePipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return this.starts.next().asTriple();
		}
	}
	return this.add(o);
}

// Suplied object as JSON
GremlinPipeline.prototype.json=function() {
	var o = new Pipe();
	o.type = 'JSONPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			return JSON.stringify(this.starts.next());
		}
	}
	return this.add(o);
}

GremlinPipeline.prototype.csv=function() {
	var o = new Pipe();
	o.type = 'CSVPipe';
	o.processNextStart=function() {
		var out = "";
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			if(el instanceof Array) {
				for(var i=0;i<el.length;i++) {
					var row = el[i];
					var arr = [];
					if(i==0) {
						// Header
						for(var member in el[i]) {
							arr.push(member);
						}
						out+=arr.join()+'<br/>';
					}

					arr = [];
					for(var member in el[i]) {
						arr.push(el[i][member]);
					}
					out+=arr.join()+'<br/>';
				}
			} else if(typeof el ==='object') {
				out = "key,value<br/>";
				for(var member in el) {
					out=out+member+", "+el[member]+"<br/>";
				}
			}
			return out;
		}
	}
	return this.add(o);
}

GremlinPipeline.prototype.matrix=function() {
	var o = new Pipe();
	o.type = 'CSVPipe';
	o.processNextStart=function() {
		var out = [];
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			if(el instanceof Array) {
				for(var i=0;i<el.length;i++) {
					var row = el[i];
					var arr = [];
					for(var member in el[i]) {
						arr.push(el[i][member]);
					}
					out.push(arr);
				}
			} else if(typeof el ==='object') {
				for(var member in el) {
					var row = [];
					row.push(member);
					row.push(el[member]);
					out.push(row);
				}
			}
			return out;
		}
	}
	return this.add(o);
}



// Get element from a previous stage
GremlinPipeline.prototype.back=function(pos) {
	var o = new MetaPipe();
	o.pipe = new Pipeline(fluentRemovePreviousPipes(this.pipes, pos));
	o.pipe.type= "BackPipe";
	o.expando = new SingleExpandableIterator();
	o.pipe.setStarts(o.expando);
	o.toString=function() {
		return this.pipe.toString();
	}
	o.processNextStart=function() {
		while (true) {
			if(this.starts.hasNext()) {
				var s = this.starts.next();
				this.expando.add(s);
				if (this.pipe.hasNext()) {
					this.pipe.next();
					return s;
				}
			} else {
				return;
			}
		}
	};
	o.getPipes=function() {
		return this.pipe.getPipes();
	}
	return this.add(o);
}

GremlinPipeline.prototype.memoize=function(pos, keyfun) {
	var o = new MetaPipe();
	o.pipe = new Pipeline(fluentRemovePreviousPipes(this.pipes, pos));
	o.pipe.type = 'MemoizePipe';
	o.expando = new SingleExpandableIterator();
	o.pipe.setStarts(o.expando);
	o.cache = {};
	o.toString=function() {
		return this.pipe.toString();
	}
	o.processNextStart=function() {
		while(true) {
			if(this.iterator && this.iterator.hasNext()) {
				return this.iterator.next();
			} else if(this.starts.hasNext()) {
				var el = this.starts.next();
				var key = typeof keyfun === 'function' ? keyfun(el) : el.toString();
				var list = this.cache[key];
				if(!list || list.length==0) {
					list = [];
					this.expando.add(el);
					while(this.pipe.hasNext()) {
						list.push(this.pipe.next());
					}
					this.cache[key] = list;
				}
				this.iterator = new ArrayIterator(list);
			} else {
				return;
			}
		}
	}
	return this.add(o);
}

GremlinPipeline.prototype.ifThenElse=function(iffun, thenfun, elsefun) {
	var o = new Pipe();
	o.type = 'IfThenElsePipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var it = this.starts.next();

			var cond = typeof iffun ==='function' ? iffun(it) : (typeof iffun ==='string' ? eval(iffun) : it);
			if(cond) {
				return typeof thenfun ==='function' ? thenfun(it) : (typeof thenfun ==='string' ? eval(thenfun) : it);
			} else {
				return typeof elsefun ==='function' ? elsefun(it) : (typeof elsefun ==='string' ? eval(elsefun) : it);
			}
		}
	};
	return this.add(o);
}

function ExpandableLoopBundleIterator(it){
        this.queue = [];
        this.iterator = it;
	this.totalResets = -1;
}
ExpandableLoopBundleIterator.prototype.next=function() {
    if (this.queue.length==0) {
	delete this.current;
	if (!this.iterator.hasNext()) {
	    this.incrTotalResets();
	}
	return this.iterator.next();
    } else {
	this.current = this.queue.shift();
	return this.current.object;
    }
}
ExpandableLoopBundleIterator.prototype.hasNext=function() {
    if (this.queue.length==0 && !this.iterator.hasNext()) {
	this.incrTotalResets();
	return false;
    } else {
	return true;
    }
}
ExpandableLoopBundleIterator.prototype.add=function(loopBundle) {
    this.queue.push(loopBundle);
}
ExpandableLoopBundleIterator.prototype.getCurrentPath=function() {
    if (this.current)
	return this.current.path;
}
ExpandableLoopBundleIterator.prototype.getCurrentLoops=function() {
    if (this.current) {
	return this.current.loops;
    } else {
	if (this.totalResets == -1)
	    return 1;
	else
	    return this.totalResets;
    }
}
ExpandableLoopBundleIterator.prototype.incrTotalResets=function() {
    if (this.totalResets == -1)
	this.totalResets = 0;
    this.totalResets++;
}
ExpandableLoopBundleIterator.prototype.clear=function() {
    this.totalResets = -1;
    delete this.current;
    this.queue.clear();
}


GremlinPipeline.prototype.loop=function(pos, whilefun, emitfun) {
	var o = new MetaPipe();
	o.pipe = new Pipeline(fluentRemovePreviousPipes(this.pipes, pos));
	o.pipe.type = 'LoopPipe';
	o.expando = new SingleExpandableIterator();
	o.toString=function() {
		return this.pipe.toString();
	}
	o.setStarts=function(iterator) {
		this.expando = new ExpandableLoopBundleIterator(iterator);
		this.pipe.setStarts(this.expando);
	}
	o.processNextStart=function() {
		while (true) {
			if(this.pipe.hasNext()) {
				var s = this.pipe.next();
				var loopBundle;
				if (this.pathEnabled)
					loopBundle = {object:s, path:this.getCurrentPath(), loops:this.getLoops()};
				else
					loopBundle = {object:s, loops:this.getLoops()};
				var str=" ";
				for(var i=0;i<loopBundle.path.length;i++) {
					str += loopBundle.path[i].getId()+", ";
				}

				var it = loopBundle;
				if (typeof whilefun ==='function' ? whilefun(it) : eval(whilefun)) {
					this.expando.add(loopBundle);
					if (emitfun && typeof emitfun === 'function' ? emitfun(it) : eval(emitfun))
						return s;
				} else {
					if (!emitfun || emitfun(loopBundle))
						return s;
				}
			} else {
				return;
			}

		}
	};
    o.getLoops=function() {
        return this.expando.getCurrentLoops() + 1;
    }

    o.getCurrentPath=function() {
        if (this.pathEnabled) {
            var path = [];
            var currentPath = this.expando.getCurrentPath();
            if (currentPath){
                path = path.concat(currentPath);
                path = path.concat(this.pipe.getCurrentPath().splice(-1)); // Remove last from the previous not to duplicate
	    } else {
                path = path.concat(this.pipe.getCurrentPath());
	    }
            return path;
        } else {
            throw new Error("Paths not enabled");
        }
    }

    o.reset=function() {
        this.expando.clear();
        Pipe.prototype.reset.call(this);
    }

	return this.add(o);
}

// Add each element that passes into supplied array
GremlinPipeline.prototype.aggregate=function(arr) {
	var o = new Pipe();
	o.type = 'AggregatePipe';
	o.arr = arr instanceof Array ? arr : [];
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			arr.push(el);
			return el;
		}
	};
	o.reset=function() {
		this.map = {};
		Pipe.prototype.reset.call(this);
	};

	return this.add(o);
}
GremlinPipeline.prototype.row=function(stepNames,funs) {
	var o = new Pipe();
	o.type = 'RowPipe';
	o.stepNames = [];
	if(typeof funs!=='undefined') {
		o.funs = funs instanceof Array ? funs : [funs] ;
	}
	o.isGreedy = true;

	var allAsPipes = fluentGetAsPipes(this);
	if(stepNames instanceof Array) {
		var pipeMap = {};
		for(var i=0;i<allAsPipes.length;i++) {
			var p = allAsPipes[i];
			pipeMap[p.name]=p;
		}
		o.asPipes = []
		for(var i=0;i<stepNames.length;i++) {
			var n = pipeMap[stepNames[i]];
			if( n && (!o.pipeMap || o.pipeMap[n.name])) {
				o.asPipes.push(n);
			}
		}
	} else {
		o.asPipes = allAsPipes;
	}

	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			var row = {};
			for(var i=0;i<this.asPipes.length;i++) {
				var name=this.asPipes[i].name;
				// TODO: Function
				var val = this.asPipes[i].currentEnd;
				if(this.funs) {
					var f = this.funs[i%this.funs.length];
					var it = val;
					val = typeof f ==='function' ? f(val) : eval(f);
				}
				row[name]=val;
			}
			return row;
		}
	}

	return this.add(o);
}
GremlinPipeline.prototype.table=function(stepNames,funs) {
	var o = new Pipe();
	o.type = 'TablePipe';
	o.stepNames = [];
	o.table = [];
	if(typeof funs!=='undefined') {
		o.funs = funs instanceof Array ? funs : [funs] ;
	}
	o.isGreedy = true;

	var allAsPipes = fluentGetAsPipes(this);
	if(stepNames instanceof Array) {
		var pipeMap = {};
		for(var i=0;i<allAsPipes.length;i++) {
			var p = allAsPipes[i];
			pipeMap[p.name]=p;
		}
		o.asPipes = []
		for(var i=0;i<stepNames.length;i++) {
			var n = pipeMap[stepNames[i]];
			if( n && (!o.pipeMap || o.pipeMap[n.name])) {
				o.asPipes.push(n);
			}
		}
	} else {
		o.asPipes = allAsPipes;
	}

	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			var row = {};
			for(var i=0;i<this.asPipes.length;i++) {
				var name=this.asPipes[i].name;
				// TODO: Function
				var val = this.asPipes[i].currentEnd;
				if(this.funs) {
					var f = this.funs[i%this.funs.length];
					var it = val;
					val = typeof f ==='function' ? f(val) : eval(f);
				}
				row[name]=val;
			}
			this.table.push(row);
			return el;
		}
	}
	o.getSideEffect=function() {
		return this.table;
	}

	return this.add(o);
}

// Degrees:
// TODO: Do not take into account literals
function getDeg(hdt, id, dir) {
	var deg=0;
	var d = hdt.dictionary;
	var t = hdt.triples;
	if((dir=='in'||dir=='both') && id<=hdt.dictionary.getNobjects()) {
		deg = t.search(0,0,id).numResults();
	}
	if((dir=='out'||dir=='both') && id<d.getNsubjects()) {
		deg += t.search(id).numResults();
	}
	return deg;
}

GremlinPipeline.prototype.degree=function(dir) {
	var o = new Pipe();
	o.type = 'DegreePipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			return getDeg(el.graph.hdt, el.id, dir);
		}
	};
	return this.add(o);
}

// Allow only a random number of elements to pass. bias=0, noone passes. bias=1 all pass
GremlinPipeline.prototype.random=function(bias) {
	var o = new Pipe();
	bias = typeof bias === 'undefined' ? .5 : bias;
	o.type = 'RandomPipe';
	o.processNextStart=function() {
		while(this.starts.hasNext()) {
			var el = this.starts.next();
			if(Math.random()<bias) {
				return el;
			}
		}
	};
	return this.add(o);
}

GremlinPipeline.prototype.deg=function() {
	return this.degree('both');
}
GremlinPipeline.prototype.degOut=function() {
	return this.degree('out');
}
GremlinPipeline.prototype.degIn=function() {
	return this.degree('in');
}

// Identity
GremlinPipeline.prototype._=function(arg) {
	return this.add(new IdentityPipe(arg));
}

// The cap step will greedily iterate the pipeline and then, when its empty, emit the side effect of the previous pipe.
GremlinPipeline.prototype.cap=function(greedy) {
	var o = new Pipe();
	o.type = 'CapPipe';
	o.processNextStart=function() {
		var some = false;
		var g= typeof greedy !== 'undefined' ? greedy : this.starts.isGreedy;
		if(g){
			while(this.starts.hasNext()) {
				some = true;
				this.starts.next();
			}
		} else {
			if(this.starts.hasNext()) {
				some = true;
				this.starts.next();
			}
		}
		if(some) {
			return this.starts.getSideEffect();
		}
	};
	return this.add(o);
}

// Group count
GremlinPipeline.prototype.groupBy=function(map, keyFun, valueFun) {
	var o = new Pipe();
	o.type = 'GroupByPipe';
	o.map = typeof map !=='undefined' ? map : {};
	o.isGreedy = true;
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			var key = (typeof keyFun ==='function') ? keyFun(el) : el;
			var value = (typeof valueFun ==='function') ? valueFun(el) : el;
			var arr = this.map[key];
			if(arr) {
				arr.push(value);
			} else {
				this.map[key] = [ value ];
			}
			return el;
		}
	};
	o.reset=function() {
		this.map = {};
		Pipe.prototype.reset.call(this);
	};
	o.getSideEffect=function() {
		return this.map;
	};

	return this.add(o);
}
// Group count
GremlinPipeline.prototype.groupCount=function(map, fun) {
	var o = new Pipe();
	o.type = 'GroupCountPipe';
	o.map = typeof map ==='object' ? map : {};
	o.isGreedy = true;
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			var val = (typeof fun ==='function') ? fun(el) : el;
			var count = this.map[val];
			this.map[val] = (typeof count === 'undefined') ? 1 : (count+1);
			return el;
		}
	};
	o.reset=function() {
		this.map = {};
		Pipe.prototype.reset.call(this);
	};
	o.getSideEffect=function() {
		return this.map;
	};

	return this.add(o);
}

GremlinPipeline.prototype.path=function(fun) {
	var o = new Pipe();
	o.type = 'PathPipe';
	o.processNextStart=function() {
		if(this.starts.hasNext()) {
			var el = this.starts.next();
			var path = this.starts.getCurrentPath();
			if(typeof fun === 'function') {
				for(var i=0;i<path.length;i++) {
					path[i] = fun(path[i]);
				}
			}
			return path;
		}
	}
	return this.add(o);
}



        // Enable module loading if available
        if (typeof module !== 'undefined' && module["exports"]) { // CommonJS
                module["exports"] = GremlinPipeline;
        } else if (typeof define !== 'undefined' && define["amd"]) { // AMD
                define("GremlinPipeline", [], function() { return GremlinPipeline });
        } else { // Shim
                global["GremlinPipeline"] = GremlinPipeline;
        }

})(this);
