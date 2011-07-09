// $Id$

namespace("ui",
{

// simple panel
//
panel: function(opts)
{
  ui.inherit_basic_panel(this, opts);
},


// panel with borders (todo: use a panel instead?)
//
status_bar: function()
{
  ui.inherit_basic_panel(this, 
    {layout: new ui.horizontal_layout(
      {padding: 16, margin: 3, valign: "center"})});

  var self = this;
  
  var init = function()
  {
    self.borders({bottom: 1});
    self.option("background", ui.theme.panel_color());
  };

  self.typename = function()
  {
    return "statusbar";
  }
  
  init();
},


// floating panel with yellow background, meant to be used with
// root panel
//
tooltip: function(opts)
{
  ui.inherit_basic_panel(this, 
    merge(opts, {layout: new ui.border_layout({margin: 2})}));
  var self = this;


  // constructor
  //
  var init = function()
  {
    // unless the user sets the position manually, the tooltip will
    // be positioned automatically (on the mouse cursor)
    self.position(new point(-1, -1));

    var s = "";    
    if (self.option("caption") != undefined)
      s = self.option("caption");
    
    self.caption(s);
    
    self.borders({all: 1});
    self.option("background", ui.theme.tooltip_color());
  };
  
  // sets the text on the tooltip; this calls label() with a
  // simple label that contains the text
  //
  self.caption = function(s)
  {
    if (s == undefined)
      s = "";
    
    self.label(new ui.label({caption: s}));
  };
  
  // sets the content of the tooltip to any kind of control
  //
  self.label = function(c)
  {
    self.remove_all();
    self.add(c, ui.sides.center);
  };
 
  // debug: returns the name of this control
  //
  self.typename = function()
  {
    return "tooltip";
  };
  
  // because the tooltip is not normally in a root panel (and does not
  // usually have a valid parent), its layout is recalculated every
  // time
  //
  self.relayout = function()
  {
    self.do_layout();
  };
  
  init();
},


// a simple horizontal line
//
// options:
//  size (positive integer), default: 1
//    height in pixels of the line
//
//  margin (positive integer), default: 5
//    space around the line
//
//  color (color object), default: black
//    color of the line
//
line: function(opts)
{
  ui.inherit_control(this, opts);
  var self = this;
  

  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      size: 1,
      margin: 5,
      color: new color().black()});
  };

  // margins + line size
  //
  self.best_dimension = function()
  {
    var d = new dimension(-1, self.option("margin")*2 + self.option("size"));
    assert(valid_dimension(d));

    return d;
  };
  
  // draws the line
  //
  self.draw = function(context)
  {
    self.control__draw(context);
    
    var r = new rectangle(
      self.position().x + self.option("margin"),
      self.position().y + self.option("margin"),
      self.width() - self.option("margin")*2,
      self.option("size"));
    
    context.fillStyle = self.option("color").string();
    context.fillRect(r.x, r.y, r.w, r.h);
  };
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "line";
  };
  
  init();
},


// a simple image with a possible overlay
//
// the images must be Image objects
//
// todo: this assumes the image is already loaded, load it on the fly
// and redraw
//
//  image (Image object), default: undefined
//    initial image
//
//  overlay (Image object), default: undefined
//    initial overlay
//
//  margin (positive integer), default: 5
//    space around the image
//
//  halign (left, center, right), default: center
//    horizontal alignement of the image
//
//  valign (top, center, bottom), default: center
//    vertical alignment of the image
//
//  overlay_halign (left, center, right), default: center
//    horizontal alignment of the overlay (if present) over the main
//    image (not the available space, ignored if both images have the
//    same size)
//
//  overlay_valign (top, center, bottom), default: center
//    vertical alignment of the overlay (if present) over the main
//    image (not the available space, ignored if both images have the
//    same size)
//
//  overlay_grayed (true/false), default: true
//    when the control is disabled, also gray out the overlay
//
//  alpha ([0.0, 1.0]), default: 1.0
//    transparency of the overlay
//
image: function(opts)
{
  ui.inherit_control(this, opts);
  var self = this;

  var image_ = undefined;
  var overlay_ = undefined;

  var init = function()
  {
    self.set_default_options({
      image: undefined,
      overlay: undefined,
      margin: 0,
      halign: "center",
      valign: "center",
      overlay_halign: "center",
      overlay_valign: "center",
      overlay_grayed: true,
      alpha: 1.0});

    assert(one_of(self.option("halign"), ["left", "center", "right"]));
    assert(one_of(self.option("valign"), ["top", "center", "bottom"]));
    assert(one_of(self.option("overlay_halign"), ["left", "center", "right"]));
    assert(one_of(self.option("overlay_valign"), ["top", "center", "bottom"]));
    assert(one_of(self.option("overlay_grayed"), [true, false]));
    assert(self.option("alpha") >= 0.0 && self.option("alpha") <= 1.0);

    if (self.option("image") != undefined)
      self.image(self.option("image"));

    if (self.option("overlay") != undefined)
      self.overlay(self.option("overlay"));
  };

  // if i is not undefined, sets the image; in any case returns the
  // current image
  //
  self.image = function(i)
  {
    // todo: disabled image is always generated, might be better to
    // create it on the fly when needed

    if (i != undefined)
    {
      image_ = i;

      require_loaded(image_, function()
        {
          var d = create_grayscale(image_);
          require_loaded(d, mem_fun('relayout', self));
        });
    }

    return image_;
  }

  // if i is not undefined, sets the overlay; in any case returns the
  // current image
  //
  self.overlay = function(i)
  {
    if (i != undefined)
    {
      overlay_ = i;

      require_loaded(overlay_, function()
        {
          var d = create_grayscale(overlay_);
          require_loaded(d, mem_fun('relayout', self));
        });
    }

    return overlay_;
  };

  // margins + largest image
  //
  self.best_dimension = function()
  {
    if (image_ == undefined || !image_.complete)
      return new dimension(0, 0);

    var d = new dimension(image_.width, image_.height);

    if (overlay_ != undefined)
    {
      d.w = Math.max(d.w, overlay_.width);
      d.h = Math.max(d.h, overlay_.height);
    }

    d.w += self.option("margin")*2;
    d.h += self.option("margin")*2;

    assert(valid_dimension(d));
    return d;
  };

  var make_image_bounds = function()
  {
    var r = self.bounds();

    if (self.option("halign") == "center")
      r.x = r.x + r.w/2 - image_.width/2;
    else if (self.option("halign") == "right")
      r.x = r.x + r.w - image_.width - self.option("margin");
    
    if (self.option("valign") == "center")
      r.y = r.y + r.h/2 - image_.height/2;
    else if (self.option("valign") == "bottom")
      r.y = r.y + r.h - image_.height - self.option("margin");

    var b = new rectangle(r.x, r.y, image_.width, image_.height);
    assert(valid_bounds(b));

    return b;
  }

  var make_overlay_bounds = function(r)
  {
    if (self.option("overlay_halign") == "center")
      r.x = r.x + r.w/2 - overlay_.width/2;
    else if (self.option("overlay_halign") == "right")
      r.x = r.x + r.w - overlay_.width;

    if (self.option("overlay_valign") == "center")
      r.y = r.y + r.h/2 - overlay_.height/2;
    else if (self.option("overlay_valign") == "bottom")
      r.y = r.y + r.h - overlay_.height;

    var b = new rectangle(r.x, r.y, overlay_.width, overlay_.height);
    assert(valid_bounds(b));

    return b;
  }
  
  // draws the image
  //
  self.draw = function(context)
  {
    self.control__draw(context);

    if (image_ == undefined || !image_.complete)
      return;
    
    var r = make_image_bounds();

    if (!self.enabled())
      draw_image(context, create_grayscale(image_), r);
    else
      draw_image(context, image_, r);

    if (overlay_ != undefined)
    {
      r = make_overlay_bounds(r);

      if (!self.enabled() && self.option("overlay_grayed"))
        draw_image(context, create_grayscale(overlay_), r, self.option("alpha"));
      else
        draw_image(context, overlay_, r, self.option("alpha"));
    }
  };

  self.typename = function()
  {
    return "image";
  }
  
  init();
}

});   // namespace ui
