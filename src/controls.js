// $Id$

namespace("ui",
{

// simple panel
//
panel: function(opts)
{
  ui.inherit_basic_panel(this, opts);
},

// an empty control that has the best dimension given
// 
// options:
//   size (dimension object), default: new dimension(0, 0)
//   size in pixels
//
spacer: function(opts)
{
  ui.inherit_control(this, opts);
  var self = this;

  var init = function()
  {
    self.set_default_options({
      size: new dimension(0, 0)
    });

    self.transparent(true);
  };

  self.best_dimension = function()
  {
    return self.option("size");
  }

  init();
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


// displays a link to the given url and opens the url on click
//
// options:
//   url (string), default: ""
//   the url to open when clicked
//
//   target (string), default: "_blank"
//   the target in which to open the link; this is the same as the
//   "target" attribute of the "a" element:
//
//     _blank: new window/tab
//     _parent: parent frame
//     _self: current window/tab
//     _top: top frame
//     anything else: the name of a window
//
link: function(opts)
{
  ui.inherit_label(this, opts);
  var self = this;

  var init = function()
  {
    self.set_default_options({
      url: "",
      target: "_blank"
    });

    self.cursor("pointer");
    self.option("color", ui.theme.link_color());
    self.font().underlined(true);

    check_tooltip();
  };

  var check_tooltip = function()
  {
    if (self.option("url") != "")
      self.tooltip(new ui.tooltip({caption: self.option("url")}));
    else
      self.reset_tooltip();
  }

  self.option = function(n, v)
  {
    var r = self.control__option(n, v);

    if (n == "url" && v != undefined)
      check_tooltip();

    return r;
  }

  self.draw = function(context)
  {
    self.label__draw(context);
  }

  self.on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (self.option("url") != "")
      window.open(self.option("url"), self.option("target"));
  }

  init();
}

});   // namespace ui
