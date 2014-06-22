var UI = {
    canvas: null,
    ctx: null,
    resize: function() {
        this.canvas.width(window.innerWidth);
        this.canvas.height(window.innerHeight);
    },
    init: function() {
        this.canvas = $("#canvas_result");
        $(window).resize(UI.resize.bind( UI ) );

        UI.resize();
        document.onselectstart = function() {
            return false;
        };
    }
};
UI.init();
