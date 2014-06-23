var ARROW_SIZE = 8;

function activate_transition(net, tname) {
    // Collect input places
    var input_places = [];
    var input_quantity = [];
    
    for(var i = 0; i < net.place_transition.length; i++) {
		if(net.place_transition[i][1] === tname) {
		    input_places.push(net.place_transition[i][0]);
		    input_quantity.push(net.place_transition[i][2]);
		}
    }
    
    // Check that input places are all marked
    // Note: If there are no input places, transition is always firable
    for(var i = 0; i < input_places.length; i++) {
		if(net.places[input_places[i]].mark < input_quantity[i]) {
		    return;
		}	
    }

    // Collect output places
    var output_places = [];
    var output_quantity = [];
    for(var i = 0; i < net.transition_place.length; i++) {
		if(net.transition_place[i][0] === tname) {
		    output_places.push(net.transition_place[i][1]);
		    output_quantity.push(net.transition_place[i][2]);
		}
    }

    // Decrement input place token count
    for (var i = 0; i < input_places.length; i++) {
		var pname = input_places[i];
		net.places[pname].mark = Math.max(net.places[pname].mark - input_quantity[i], 0);
    }
	
    // Increment output place token count
    for(var i = 0; i < output_places.length; i++) {
		var pname = output_places[i];
		net.places[pname].mark += output_quantity[i];
    }
}

function PlaceElement(visualization, name, place) {
    this.vis = visualization;
    this.name = name;
    this.p = place;
    this.circle = this.vis.paper.circle(this.p.x, this.p.y, this.vis.pr);
    this.circle.attr({fill: "#fff"});
    this.tokens = this.vis.paper.set();
    this.name_text = this.vis.paper.text(this.p.x, this.p.y + (this.vis.pr / 2) + 2, this.name);
}

PlaceElement.prototype = {
    'set_n_tokens' : function(n) {
	this.tokens.forEach(function(e) {
	    e.remove();
	});
	this.tokens.clear();
	// For now, manually handle n <= 3
	switch(n) {
	case 0:
	    break;
	case 1:
	    this.tokens.push(this.vis.paper.circle(this.p.x, this.p.y, 4));
	    break;
	case 2:
	    this.tokens.push(this.vis.paper.circle(this.p.x - 7, this.p.y, 4));
	    this.tokens.push(this.vis.paper.circle(this.p.x + 7, this.p.y, 4));
	    break;
	case 3:
	    this.tokens.push(this.vis.paper.circle(this.p.x - 7, this.p.y, 4));
	    this.tokens.push(this.vis.paper.circle(this.p.x + 7, this.p.y, 4));
	    this.tokens.push(this.vis.paper.circle(this.p.x, this.p.y - 14, 4));
	    break;
	default:
	    var number_text = this.vis.paper.text(this.p.x, this.p.y, n.toString());
	    number_text.attr({'font-size' : 14});
	    this.tokens.push(number_text);
	}
	this.tokens.attr({fill: "black"});
    }
};


function TransitionElement(vis, name, transition) {
    this.vis = vis;
    this.name = name;
    this.t = transition;
    var th = vis.th;
    var tw = vis.tw;
    
    if(this.t.orientation === 1) {
		this.rect = vis.paper.rect(this.t.x - tw/2, this.t.y - th/2, tw, th);
		this.name_text = vis.paper.text(this.t.x - tw/2 + 5, this.t.y, name);
    } else {
		this.rect = vis.paper.rect(this.t.x - th/2, this.t.y - tw/2, th, tw);
		this.name_text = vis.paper.text(this.t.x, this.t.y - tw/2 + 5, name);
		this.name_text.transform('r90');
    }
    this.rect.attr({fill: "white"});
    this.name_text.attr({'text-anchor' : 'start'});
    var activation_callback = function () {
    	activate_transition(vis.net, name)
    	vis.update_marking();
    };
    
    var trans = vis.paper.set();
    trans.push(this.rect);
    trans.push(this.name_text);
    
    trans.click(activation_callback);
    trans.mouseover(function(){
    	trans.attr({"cursor": "pointer"});
    });
    trans.mouseout(function(){
    	trans.attr({"cursor": "default"});
    });
}

TransitionElement.prototype = {
};

function PetriNetVisualization(paper, net) {
    this.net = net;
    this.paper = paper;
    
    // Create place circles
    this.place_elements = {};
    for(var name in net.places) {
		var p = net.places[name];
		this.place_elements[name] = new PlaceElement(this, name, p);
    }
    
    // Create transition boxes
    this.transition_elements = {};
    for(var name in net.transitions) {
		var t = net.transitions[name];
		this.transition_elements[name] = new TransitionElement(this, name, t);
    }

    
    // Create links
    this.link_elements = [];
    
    var countInputTransitions = {};
    for (var i=0; i < net.place_transition.length; i++) {
    	var trans = net.place_transition[i][1];
    	if (!countInputTransitions[trans]) {
    		countInputTransitions[trans] = {index:0, count: 0};
    	}
    	
    	countInputTransitions[trans].count++;
    }
    
    for (var i=0; i < net.place_transition.length; i++) {
		var pt = net.place_transition[i];
		var trans = pt[1];
		
		this.link_elements.push(this.create_link(net.places[pt[0]], net.transitions[trans], pt[2], true, countInputTransitions[trans]));
		countInputTransitions[trans].index++;
    }
    for (var i=0; i < net.transition_place.length; i++) {
		var tp = net.transition_place[i];
		this.link_elements.push(this.create_link(net.places[tp[1]], net.transitions[tp[0]], tp[2], false, null));
    }

    this.update_marking();
}

PetriNetVisualization.prototype = {
		// Transition width
    "tw" : 50,
    	// Transition height
    "th" : 20,
    	// Place radius
    "pr" : 25,    
    "create_link" : function(p, t, weight, forwardp, auxInputTransitions) {
	var a, b;

	// Pick a connection point on the transition box
	if(t.orientation === 1) {
	    // Horizontal
	    if(p.y > t.y) {
	    	b = [t.x, t.y + this.th/2];
	    } else {
	    	b = [t.x, t.y - this.th/2];
	    }
	    
	    if (auxInputTransitions) {
	    	b[0] = b[0] + (auxInputTransitions.index+1) * (this.tw / (auxInputTransitions.count+1)) - this.tw/2;
	    }
	}
	else {
	    // Vertical
	    if(p.x > t.x) {
	    	b = [t.x + this.th/2, t.y];
	    } else {
	    	b = [t.x - this.th/2, t.y];
	    }
	    
	    if (auxInputTransitions) {
	    	b[1] = b[1] + (auxInputTransitions.index+1) * (this.tw / (auxInputTransitions.count+1)) - this.tw/2;
	    }
	}
	
	var theta = Math.atan2(b[1] - p.y, b[0] - p.x);
	a = [p.x + this.pr * Math.cos(theta), p.y + this.pr * Math.sin(theta)];

	var label = "";
	if (weight > 1) {
		label += weight;
	}
	
	return drawArrow(a, b, !forwardp, label);
    },
    "update_marking" : function() {
		for(var pname in this.net.places) {
	    	this.place_elements[pname].set_n_tokens(this.net.places[pname].mark);
		}
    }
};

function drawArrow(pointA, pointB, inverse, label) {
	var elems = {};
	
	var theta = Math.atan2(pointB[1] - pointA[1], pointB[0] - pointA[0]);
	var path_string;
	path_string = line_cmd(pointA[0], pointA[1], pointB[0], pointB[1]);
	elems.line = this.paper.path(path_string);
	elems.line.toBack();
	
	if (label) {
		var newPoint = [(pointB[0] + pointA[0]) / 2, (pointB[1] + pointA[1]) / 2];
		newPoint = [newPoint[0] + 10 * Math.cos(theta + Math.PI/2), newPoint[1] + 10 * Math.sin(theta + Math.PI/2)];
	
		elems.label = this.paper.text(newPoint[0], newPoint[1], label);
		elems.label.attr({'text-anchor' : 'middle'});
	}

	if (inverse !== null) {
		// Add arrow
		var mx = null;
		var my = null;
		var arrow_string = '';
		if(inverse) {
			mx = pointA[0];
			my = pointA[1];
			
			var point1 = [mx - ARROW_SIZE * Math.cos(theta + 3 * Math.PI/4), my - ARROW_SIZE * Math.sin(theta + 3 * Math.PI/4)];
			var point2 = [mx - ARROW_SIZE * Math.cos(theta - 3 * Math.PI/4), my - ARROW_SIZE * Math.sin(theta - 3 * Math.PI/4)];
			
			arrow_string = line_cmd2(point1[0], point1[1], mx, my, point2[0], point2[1]);
		} else {
			mx = pointB[0];
			my = pointB[1];
			
			var point1 = [mx + ARROW_SIZE * Math.cos(theta + 3 * Math.PI/4), my + ARROW_SIZE * Math.sin(theta + 3 * Math.PI/4)];
			var point2 = [mx + ARROW_SIZE * Math.cos(theta - 3 * Math.PI/4), my + ARROW_SIZE * Math.sin(theta - 3 * Math.PI/4)];
			
			arrow_string = line_cmd2(point1[0], point1[1], mx, my, point2[0], point2[1]);
		}
		elems.arrow = this.paper.path(arrow_string);
	elems.arrow.attr({fill: "black"});
	}
	
	return elems;
}

function line_cmd(x0, y0, x1, y1) {
    var cmd_str = 'M' + x0.toFixed() + ',' + y0.toFixed();
    cmd_str += 'L' + x1.toFixed() + ',' + y1.toFixed();
    return cmd_str;
}

function line_cmd2(x0, y0, x1, y1, x2, y2) {
    var cmd_str = line_cmd(x0, y0, x1, y1);
    cmd_str += 'L' + x2.toFixed() + ',' + y2.toFixed() + "Z";
    return cmd_str;
}