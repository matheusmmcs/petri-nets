var paper;

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
						arrayToPush.push([currentLink[0], currentLink[1]]);
					}
				}
			}
		}
	}
	
	paper.clear();
	var vis = new PetriNetVisualization(paper, result);
	console.log(vis);
}