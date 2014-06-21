$(document).ready(function() {
	// ### Specify ###
	
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
		console.log(valueSpec);
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