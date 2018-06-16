odoo.define('padtool.Canvas', function (require) {
"use strict";

var Cross = fabric.util.createClass(fabric.Object, {
    objectCaching: false,
    initialize: function(options) {
      this.callSuper('initialize', options);
      this.animDirection = 'up';

      this.width = options&&options.width||100;
      this.height = options&&options.height||100;

      this.w1 = this.h2 = this.width;
      this.h1 = this.w2 = 2;
    },

    animateWidthHeight: function() {
      var interval = 2;

      if (this.h2 >= 30 && this.h2 <= 100) {
        var actualInterval = (this.animDirection === 'up' ? interval : -interval);
        this.h2 += actualInterval;
        this.w1 += actualInterval;
      }

      if (this.h2 >= 100) {
        this.animDirection = 'down';
        this.h2 -= interval;
        this.w1 -= interval;
      }
      if (this.h2 <= 30) {
        this.animDirection = 'up';
        this.h2 += interval;
        this.w1 += interval;
      }
    },

    _render: function(ctx) {
      ctx.fillRect(-this.w1 / 2, -this.h1 / 2, this.w1, this.h1);
      ctx.fillRect(-this.w2 / 2, -this.h2 / 2, this.w2, this.h2);
      ctx.fillStyle = '#4FC3F7';
      //ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(0,0,this.width/2,0,Math.PI * 2, false);
      ctx.fill();

    }
  });

var Hawkeye = fabric.util.createClass(fabric.Image, {
    H_PADDING: 20,
    V_PADDING: 50,
    originX: 'center',
    originY: 'center',
    initialize: function(src, options) {
      this.callSuper('initialize', options);
      this.image = new Image();
      this.image.src = options.src;
      this.image.onload = (function() {
        this.width = this.image.width;
        this.height = this.image.height;
        this.loaded = true;
        this.setCoords();
        this.fire('image:loaded');
      }).bind(this);
    },
    _render: function(ctx) {
      if (this.loaded) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(
          -(this.width / 2) - this.H_PADDING,
          -(this.height / 2) - this.H_PADDING,
          this.width + this.H_PADDING * 2,
          this.height + this.V_PADDING * 2);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2);
      }
    }
});


return {
	Cross: Cross,
	Hawkeye:Hawkeye
};

});