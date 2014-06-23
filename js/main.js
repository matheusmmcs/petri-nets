var paper, petriVis;

$(document).ready(function() {
	paper = new Raphael(document.getElementById('canvas_result'));
	
	// Div onde se pode especificar um automato atraves de texto
	var divSpec = $(".petris-spec-area");
	var specArea = divSpec.find("textarea");
	var specConfirm = divSpec.find(".spec-area-confirm a");
	
	$(".spec-area").click(function() {
		if (divSpec.is(":visible")) {
			divSpec.hide();
		} else {
			divSpec.show();
		}
	});
	
	specConfirm.click(function() {
		var valueSpec = specArea.val();
		parseSpecification(valueSpec);
	});
	
	// ### Credits ###
	
	$(".credits-area").click(function() {
		if ($(".credits-area-name:eq(0)").is(":visible")) {
			$(".credits-area-name").slideUp();
		} else {
			$(".credits-area-name").slideDown();
		}
	});
	
	$(".operation-coverage-tree").click(function() {
		var coverageTree = getCoverageTree();
		drawTree(coverageTree);
	});
});

function parseSpecification(specification) {
	var result = {places: {}, transitions: {}, place_transition: [], transition_place: []};
	
	var splittedSpec = specification.split("\n");
	for (var index = 0, length = splittedSpec.length; index < length; index++) {
		var lineSpec = splittedSpec[index].trim();
		var line = lineSpec.split(/\s+/);
		
		if (line.length) {
			if (line[0] == "p") {
				var markCount = 0;
				if (line.length >= 5) {
					markCount = parseInt(line[4]);
				}
				
				result.places[line[1]] = {x: parseFloat(line[2]), y: parseFloat(line[3]), mark: markCount};
			} else if (line[0] == "t") {
				result.transitions[line[1]] = {x: parseFloat(line[2]), y: parseFloat(line[3]), orientation: parseInt(line[4])};
			} else if (line[0] == "l_pt" || line[0] == "l_tp") {
				var arrayToPush = null;
				if (line[0] == "l_pt") {
					arrayToPush = result.place_transition;
				} else {
					arrayToPush = result.transition_place;
				}
				
				var contentLine = lineSpec.substring(4).trim().split(";");
				for (var index1 = 0, length1 = contentLine.length; index1 < length1; index1++) {
					var currentContent = contentLine[index1].trim();
					
					if (currentContent.length) {
						var currentLink = currentContent.split(/\s+/);
						
						var weight = 1;
						if (currentLink.length >= 3){
							weight = parseInt(currentLink[2]);
						}
						
						arrayToPush.push([currentLink[0], currentLink[1], weight]);
					}
				}
			}
		}
	}
	
	paper.clear();
	petriVis = new PetriNetVisualization(paper, result);
}

function getCoverageTree() {
	var initialMarking = {};
	for (var p in petriVis.net.places) {
		initialMarking[p] = petriVis.net.places[p].mark;
	}
	
	var transitionEffets = {};
	
	var placeTransition = petriVis.net.place_transition;
	for (var index = 0, length = placeTransition.length; index < length; index++) {
		var place = placeTransition[index][0];
		var transition = placeTransition[index][1];
		var weight = placeTransition[index][2];
		
		if (!transitionEffets[transition]) {
			transitionEffets[transition] = {input:{}, output: {}};
		}
		if (!transitionEffets[transition].input[place]) {
			transitionEffets[transition].input[place] = 0;
		}
		transitionEffets[transition].input[place] += weight;
	}
	
	var transitionPlace = petriVis.net.transition_place;
	for (var index = 0, length = transitionPlace.length; index < length; index++) {
		var transition = transitionPlace[index][0];
		var place = transitionPlace[index][1];
		var weight = transitionPlace[index][2];
		
		if (!transitionEffets[transition]) {
			transitionEffets[transition] = {input:{}, output: {}};
		}
		if (!transitionEffets[transition].output[place]) {
			transitionEffets[transition].output[place] = 0;
		}
		transitionEffets[transition].output[place] += weight;
	}
	
	var result = {root: null};
	
	function checkNode(node) {
		// Check Repeat
		function checkRepeat(auxRepeat) {
			if (auxRepeat != node) {
				var allEquals = true;
				for (var place in node.marking) {
					if (node.marking[place] != auxRepeat.marking[place]) {
						allEquals = false;
					}
				}
				
				if (allEquals) {
					return true;
				}
			}
			for (var index in auxRepeat.children) {
				if (checkRepeat(auxRepeat.children[index])) {
					return true;
				}
			}
			
			return false;
		}
		
		if (checkRepeat(result.root)) {
			return {status: "repeat"};
		}
		
		// Check coverage
		var parent = node.parent;
		while (parent != null) {
			var cover = true;
			for (var place in node.marking) {
				if (node.marking[place] != "w" && node.marking[place] < parent.marking[place]) {
					cover = false;
				}
			}
			
			if (cover) {
				return {status: "cover", node: parent};
			}
			
			parent = parent.parent;
		}
		
		return {status: "normal"};
	};
	
	function addNodes(parent) {
		if (parent) {
			var parentMarking = parent.marking;
			
			for (var trans in transitionEffets) {
				var input = transitionEffets[trans].input;
				var output = transitionEffets[trans].output;
				
				var transActive = true;
				for (var place in input) {
					if (parentMarking[place] != "w" && parentMarking[place] < input[place]) {
						transActive = false;
					}
				}
				
				if (transActive) {
					var newNode = {marking: $.extend({}, parentMarking), parent: parent, parentTrans: trans, children: []};
					parent.children.push(newNode);
					
					for (var place in input) {
						if (newNode.marking[place] != "w") {
							newNode.marking[place] -= input[place];
						}
					}
					for (var place in output) {
						if (newNode.marking[place] != "w") {
							newNode.marking[place] += output[place];
						}
					}
					
					var checkResult = checkNode(newNode);
					if (checkResult.status == "cover") {
						for (var place in newNode.marking) {
							var nodeCheckedMarking = checkResult.node.marking[place];
							if (nodeCheckedMarking == "w" || newNode.marking[place] > nodeCheckedMarking) {
								newNode.marking[place] = "w";
							}
						}
						
						addNodes(newNode);
					} else if (checkResult.status == "repeat") {
						parent.children.pop();
					} else {
						addNodes(newNode);
					}
				}
			}
		} else {
			result.root = {marking: null, parent: null, parentTrans: null, children: []};
			result.root.marking = $.extend({}, initialMarking);
			
			addNodes(result.root);
		}
	}

	addNodes(null);
	
	return result;
}

function drawTree(tree) {
	paper.clear();
	
	var root = tree.root;
	
	var posX = window.innerWidth/2;
	var posY = 20;
	
	function convertMarkingToTxt(marking) {
		var values = [];
		for (var place in marking) {
			values.push(marking[place]);
		}
		
		return "["+values.join()+"]";
	}
	
	var sampleText = paper.text(posX, posY, convertMarkingToTxt(root.marking)).attr({'text-anchor' : 'middle'});
	var sizeText = sampleText.getBBox();
	sampleText.remove();
	
	var widthRect = sizeText.width + 10;
	var heightRect = sizeText.height + 10;
//	var childWidth = 1.5 * widthRect;
//	var heightGap = 2 * heightRect;
	var childWidth = 3.5 * widthRect;
	var heightGap = 4 * heightRect;
	
	function drawNode(node, posX, posY) {
		var rect = paper.rect(posX - widthRect/2, posY - heightRect/2, widthRect, heightRect).attr({fill: "white"});
		paper.text(posX, posY, convertMarkingToTxt(node.marking)).attr({'text-anchor' : 'middle'});
		
		var baseChildrenWidth = node.children.length * (childWidth) - childWidth;
		for (var index = 0; index < node.children.length; index++) {
			var newPosX = posX - baseChildrenWidth/2 + index * childWidth;
			var newPosY = posY + heightGap;
			
			drawNode(node.children[index], newPosX, newPosY);
			drawArrow([posX, posY], [newPosX, newPosY], null, node.children[index].parentTrans);
		}
	}
	
	drawNode(root, posX, posY);
}