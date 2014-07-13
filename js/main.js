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
		
		$("#div-legend").hide();
	});
	
	// ### Credits ###
	
	$(".credits-area").click(function() {
		if ($(".credits-area-name:eq(0)").is(":visible")) {
			$(".credits-area-name").slideUp();
		} else {
			$(".credits-area-name").slideDown();
		}
	});
	
	$(".operation-coverage-tree, .operation-state-block, .operation-state-no-limited, .operation-consevation").click(function() {
		var coverageTree = getCoverageTree();
		if (coverageTree.root) {
			$("#div-legend").show();
			
			drawTree(coverageTree);
		}
	});
	
	$(".operation-reachable").click(function() {
		var desiredState = window.prompt("Qual estado a ser alcançado? Ex: '1, 0, 0, 1' (sem as aspas)");
		if (desiredState.trim()) {
			var result = checkValidInputState(desiredState);
			if (result[0]) {
				var coverageTree = getCoverageTree();
				var markings = result[1];
				
				function checkEqualsNode(node) {
					for (var indexC = 0; indexC < node.children.length; indexC++) {
						var child = checkEqualsNode(node.children[indexC]);
						if (child) {
							return child;
						}
					}
					
					var index = 0;
					for (var p in node.marking) {
						if (node.marking[p] == "w") {
							var parentNode = node.parent;
							while (parentNode != null) {
								if (parentNode.marking[p] != "w") {
									if (parentNode.marking[p] > markings[index]) {
										return false;
									}
									break;
								}
								
								parentNode = parentNode.parent;
							}
						} else {
							if (node.marking[p] != markings[index]) {
								return false;
							}
						}
						index++;
					}
					
					return node;
				}
				
				var node = checkEqualsNode(coverageTree.root);
				if (node) {
					console.log(node);
					
					var transitions = [];
					
					while (true) {
						if (node.parent != null) {
							transitions.push(node.parentTrans);
							node = node.parent;
						} else {
							break;
						}
					}
					
					window.alert("O estado é alcançável seguindo as seguintes transições: " + transitions.reverse().join(" -> "));
				} else {
					window.alert("O estado não é alcançavel");
				}
			} else {
				window.alert(result[1]);
			}
		}
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
	
	function getSumTokens(marking) {
		var sum = 0;
		
		for (var p in marking) {
			var tokens = marking[p];
			if (tokens == 'w') {
				return -1;
			} else {
				sum += tokens;
			}
		}
		
		return sum;
	}
	
	function addNodes(parent) {
		if (parent) {
			var parentMarking = parent.marking;
			
			var anyTransActive = false;
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
					anyTransActive = true;
					
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
					
					var sumTokens = getSumTokens(newNode.marking);
					if (sumTokens < 0 || sumTokens != result.root._conservativeSum) {
						result.root.conservative = false;
					}
					
					var checkResult = checkNode(newNode);
					if (checkResult.status == "cover") {
						for (var place in newNode.marking) {
							var nodeCheckedMarking = checkResult.node.marking[place];
							if (nodeCheckedMarking == "w" || newNode.marking[place] > nodeCheckedMarking) {
								result.root.limited = false;
								result.root.conservative = false;
								newNode.marking[place] = "w";
							}
						}
						
						addNodes(newNode);
					} else if (checkResult.status == "repeat") {
						newNode.repeated = true;
					} else {
						addNodes(newNode);
					}
				}
			}
			
			if (!anyTransActive) {
				parent.blocking = true;
			}
		} else {
			result.root = {marking: null, parent: null, parentTrans: null, children: [], limited: true, conservative: true};
			result.root.marking = $.extend({}, initialMarking);
			result.root._conservativeSum = getSumTokens(result.root.marking);  
			
			addNodes(result.root);
		}
	}

	addNodes(null);
	
	return result;
}

function treePrepareRoot(node, level, parentNode, leftNode, rightLimits) {
    if (level == undefined) level = 0;
    if (parentNode == undefined) parentNode = null;
    if (leftNode == undefined) leftNode = null;
    if (rightLimits == undefined) rightLimits = new Array();

    node.Level = level;
    node.ParentNode = parentNode;
    node.LeftNode = leftNode;

    if (node.children && node.children.length > 0) { // Has children and is expanded
        for (var i = 0; i < node.children.length; i++) {
            var left = null;
            if (i == 0 && rightLimits[level] != undefined) left = rightLimits[level];
            if (i > 0) left = node.children[i - 1];
            if (i == (node.children.length-1)) rightLimits[level] = node.children[i];
            treePrepareRoot(node.children[i], level + 1, node, left, rightLimits);
        }
    }
}

function treeMoveRightNode(nodes, distance) {
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].Left += distance;
        if (nodes[i].children) {
        	treeMoveRightNode(nodes[i].children, distance);
        }
    }
}

function treeAssignPosition(node) {

    var nodeHeight = 30;
    var nodeWidth = 100;
    var nodeMarginLeft = 30;
    var nodeMarginTop = 50;

    var nodeLeft = 0; // defaultValue 

    // Before Layout this Node, Layout its children
    if (node.children && node.children.length>0) {
        for (var i = 0; i < node.children.length; i++) {
        	treeAssignPosition(node.children[i]);
        }
    }

    if (node.children && node.children.length > 0) { // If Has Children and Is Expanded

        // My left is in the center of my children
        var childrenWidth = (node.children[node.children.length-1].Left + node.children[node.children.length-1].Width) - node.children[0].Left;
        nodeLeft = (node.children[0].Left + (childrenWidth / 2)) - (nodeWidth / 2);

        // Is my left over my left node?
        // Move it to the right
        if(node.LeftNode && ((node.LeftNode.Left+node.LeftNode.Width+nodeMarginLeft)>nodeLeft)) {
            var newLeft = node.LeftNode.Left + node.LeftNode.Width + nodeMarginLeft;
            var diff = newLeft - nodeLeft;
            /// Move also my children
            treeMoveRightNode(node.children, diff);
            nodeLeft = newLeft;
        }
    } else {
        // My left is next to my left sibling
        if (node.LeftNode) 
            nodeLeft = node.LeftNode.Left + node.LeftNode.Width + nodeMarginLeft;
    }

    node.Left = nodeLeft;

    // The top depends only on the level
    node.Top = (nodeMarginTop * (node.Level + 1)) + (nodeHeight * (node.Level + 1));
    // Size is constant
    node.Height = nodeHeight;
    node.Width = nodeWidth;
}

function convertMarkingToTxt(marking) {
	var values = [];
	for (var place in marking) {
		values.push(marking[place]);
	}
	
	return "["+values.join()+"]";
}

function drawTree(tree) {
	paper.clear();
	
	var root = tree.root;
	
	var posX = window.innerWidth/2;
	var posY = 20;
	
	treePrepareRoot(root);
	treeAssignPosition(root);
	
	var diffPosX = root.Left - posX;
	var diffPosY = root.Top - posY;
	
	var sampleText = paper.text(posX, posY, convertMarkingToTxt(root.marking)).attr({'text-anchor' : 'middle'});
	var sizeText = sampleText.getBBox();
	sampleText.remove();
	
	var widthRect = sizeText.width + 10;
	var heightRect = sizeText.height + 10;
	
	function drawNode(node) {
		var posX = node.Left - diffPosX;
		var posY = node.Top - diffPosY;
		
		var rect = paper.rect(posX - widthRect/2, posY - heightRect/2, widthRect, heightRect);
		if (node.blocking) {
			rect.attr({fill: "#FF8585"})
		} else if (node.repeated) {
			rect.attr({fill: "#6699FF"})
		} else {
			rect.attr({fill: "white"})
		}
		
		paper.text(posX, posY, convertMarkingToTxt(node.marking)).attr({'text-anchor' : 'middle'});
		
		for (var index = 0; index < node.children.length; index++) {
			var childNode = node.children[index];
			var newPosX = childNode.Left - diffPosX;
			var newPosY = childNode.Top - diffPosY;
			
			drawNode(childNode);
			drawArrow([posX, posY], [newPosX, newPosY], null, childNode.parentTrans);
		}
	}
	
	drawNode(root);
	
	var posInfoX = root.Left - diffPosX + widthRect/2 + 20;
	var posInfoY = root.Top - diffPosY;
	
	var infoText = null;
	if (root.limited) {
		infoText = paper.text(posInfoX, posInfoY, "RdP Limitada | " + ((root.conservative) ? "" : "Não ") +"Conservativa");
	} else {
		infoText = paper.text(posInfoX, posInfoY, "RdP Não-Limitada | Não conservativa");
	}
	
	infoText.attr({'text-anchor': 'start', 'font-size': 14, 'font-weight': 'bold'});
}

function checkValidInputState(state){
	var result = [];
	
	state = state.trim();
	var stateSplitted = state.split(",");
	
	var numKeys = Object.keys(petriVis.net.places).length;
	if (numKeys != stateSplitted.length) {
		return [false, "Existem " + numKeys + " estados, mas você entrou com " + stateSplitted.length];
	}
	
	for (var index = 0; index < stateSplitted.length; index++) {
		var tokens = parseInt(stateSplitted[index]);
		if (isNaN(tokens)) {
			return [false, "Apenas inteiros são aceitos como quantidade de tokens"];
		} else if (tokens < 0) {
			return [false, "Apenas inteiros não-negativos"];
		}
		
		result.push(tokens);
	}
	
	return [true, result];
}