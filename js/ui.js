var UI = {
    canvas: null,
    ctx: null,
    resize: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    init: function() {
        this.canvas = document.getElementsByTagName( 'canvas' )[ 0 ];
        this.ctx = this.canvas.getContext( '2d' );

        $( window ).resize( UI.resize.bind( UI ) );

        UI.resize();
        document.onselectstart = function() {
            return false;
        };
    }
};
UI.init();
