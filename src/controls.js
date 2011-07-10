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
//  orientation (vertical/horizontal), default: horizontal
//    orientation of the line
//
//  size (positive integer), default: 1
//    width or height in pixels of the line
//
//  margin (positive integer), default: 5
//    space around the line
//
//  color (color object), default: black
//    color of the line
//
separator: function(opts)
{
  ui.inherit_control(this, opts);
  var self = this;
  

  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      orientation: "horizontal",
      size: 1,
      margin: 5,
      color: new color().black()});
  };

  // margins + line size
  //
  self.best_dimension = function()
  {
    var d = new dimension(0, 0);
    var s = self.option("margin") * 2 + self.option("size");

    if (self.option("orientation") == "horizontal")
      d.h = s;
    else
      d.w = s;

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
      0, 0);

    if (self.option("orientation") == "horizontal")
    {
      r.w = self.width() - self.option("margin")*2;
      r.h = self.option("size");
    }
    else
    {
      r.w = self.option("size");
      r.h = self.height() - self.option("margin")*2;
    }
    
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


// a simple image with a possible overlay; both can be grayed when the
// control is disabled. If an image is unavailable (not loaded, bad
// uri, etc.), its alt text will be displayed.
//
// the images must be Image objects
//
//  image (image_holder object), default: undefined
//    initial image
//
//  overlay (image_holder object), default: undefined
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

  var image_ = {normal: undefined, disabled: undefined};
  var overlay_ = {normal: undefined, disabled: undefined};

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
    if (i != undefined)
    {
      assert(i.internal_is_a_image_holder);

      image_.normal = i;
      i.on_load.add(function()
        {
          self.relayout();
          return false;
        });

      self.relayout();
    }

    return image_.normal;
  }

  // if i is not undefined, sets the overlay; in any case returns the
  // current image
  //
  self.overlay = function(i)
  {
    if (i != undefined)
    {
      assert(i.internal_is_a_image_holder);

      overlay_.normal = i;
      i.on_load.add(function()
        {
          self.relayout();
          return false;
        });

      self.relayout();
    }

    return overlay_.normal;
  };

  // margins + largest image
  //
  self.best_dimension = function()
  {
    if (image_.normal == undefined)
      return new dimension(0, 0);
      
    if (!image_.normal.working())
      return text_dimension(image_.normal.alt(), self.font());

    var d = new dimension(
      image_.normal.width(), image_.normal.height());

    if (overlay_.normal != undefined)
    {
      d.w = Math.max(d.w, overlay_.normal.width());
      d.h = Math.max(d.h, overlay_.normal.height());
    }

    d.w += self.option("margin")*2;
    d.h += self.option("margin")*2;

    assert(valid_dimension(d));
    return d;
  };

  var make_image_bounds = function(i)
  {
    var r = self.bounds();

    if (i.working())
    {
      if (self.option("halign") == "center")
        r.x = r.x + r.w/2 - i.width()/2;
      else if (self.option("halign") == "right")
        r.x = r.x + r.w - i.width() - self.option("margin");
    
      if (self.option("valign") == "center")
        r.y = r.y + r.h/2 - i.height()/2;
      else if (self.option("valign") == "bottom")
        r.y = r.y + r.h - i.height() - self.option("margin");

      r = new rectangle(r.x, r.y, i.width(), i.height());
      assert(valid_bounds(r));
    }

    return r;
  }

  var make_overlay_bounds = function(r, i)
  {
    if (self.option("overlay_halign") == "center")
      r.x = r.x + r.w/2 - i.width()/2;
    else if (self.option("overlay_halign") == "right")
      r.x = r.x + r.w - i.width();

    if (self.option("overlay_valign") == "center")
      r.y = r.y + r.h/2 - i.height()/2;
    else if (self.option("overlay_valign") == "bottom")
      r.y = r.y + r.h - i.height();

    var b = new rectangle(r.x, r.y, i.width(), i.height());
    assert(valid_bounds(b));

    return b;
  }

  // returns the normal image if loaded; this will load the grayscale
  // on the fly (but may still return undefined if it is not finished
  // loading)
  //
  var current_image_impl = function(i, is_normal)
  {
    if (is_normal)
    {
      return i.normal;
    }
    else
    {
      // disabled image is ready, return it
      if (i.disabled != undefined)
        return i.disabled;

      // if there is no main image, there can't be any disabled image
      if (i.normal == undefined)
        return undefined;

      // if the main image isn't working, creating a grayscale is
      // impossible; return the main image so its alt text can be
      // displayed
      if (!i.normal.working())
        return i.normal;

      // if there is a main image but no disabled image, create it on
      // the fly and return undefined; relayout() will be called in
      // time
      i.disabled = create_grayscale(i.normal, function()
        {
          self.relayout();
          return false;
          });

      return i.disabled;
    }
  }

  // returns the normal main image if displayable, or undefined
  //
  var current_image = function()
  {
    return current_image_impl(image_, self.enabled());
  };

  // returns the normal overlay image if displayable, or undefined
  //
  var current_overlay = function()
  {
    return current_image_impl(
      overlay_, self.enabled() || !self.option("overlay_grayed"));
  };

  // draws the image
  //
  self.draw = function(context)
  {
    self.control__draw(context);

    var i = current_image();
    var o = current_overlay();

    if (i == undefined)
      return;
      
    // drawing main image
    var r = make_image_bounds(i);
    draw_image(context, i, r);

    if (o != undefined)
    {
      r = make_overlay_bounds(r, o);
      draw_image(context, o, r, self.option("alpha"));
    }
  };

  self.typename = function()
  {
    var s = "image ";

    if (image_.normal != undefined)
      s += "src:" + image_.normal.image().src + " ";

    if (overlay_.normal != undefined)
      s += "ov:" + overlay_.normal.image().src;

    return s;
  }
  
  init();
}

});   // namespace ui
