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
},

// dropdown panel that contains the list; this is needed so the best
// dimension are adjusted for the textbox size
//
cb_panel: function(cb, list, opts)
{
  ui.inherit_container(this, merge(opts,
    {layout: new ui.border_layout()}));

  var cb_ = cb;
  var list_ = list;

  this.best_dimension = function()
  {
    var lbd = list_.best_dimension();
    var min = cb.width();

    return new dimension(
      Math.max(min, lbd.w), lbd.h);
  };
},

cb_text: function(cb, opts)
{
  ui.inherit_textbox(this, opts);
  var self = this;

  var cb_ = cb;

  self.on_mouse_left_down = function(mp)
  {
    if (self.option("unresponsive"))
    {
      cb_.open();
      return true;
    }
    else
    {
      return self.textbox__on_mouse_left_down(mp);
    }
  }
},

// options:
//   dropstyle (edit, list), default: list
//     if 'edit', the textbox is editable
//
inherit_combobox: function(self, opts)
{
  ui.inherit_container(self, merge(opts,
    {layout: new ui.border_layout({margin: 1})}));
  
  var text_ = new ui.cb_text(self);
  var drop_ = new ui.button({toggle: true, fast: true});
  var list_ = new ui.list({
    show_header: false, track: true, padding: 2,
    expand_header: true
    });
  var panel_ = new ui.cb_panel(self, list_);

  var init = function()
  {
    self.set_default_options({
      dropstyle: "list"
    });

    self.borders({all: 1});

    var i = new ui.image({image:
      load_image("down.png", "v")});
    drop_.label(i);
    drop_.down.add(on_drop);

    text_.minimum_size(new dimension(10, 1));
    text_.option("unresponsive", true);
    text_.borders({all: 0});

    self.add(text_, ui.sides.center);
    self.add(drop_, ui.sides.right);
    panel_.add(list_, ui.sides.center);
    
    list_.add_column("");
    list_.add_item(["test1"]);
    list_.add_item(["test2"]);
    list_.add_item(["test3"]);
    list_.add_item(["test4"]);

    list_.on_item_clicked.add(on_selection);
  };

  var on_drop = function()
  {
    if (panel_.parent() != undefined)
      self.close();
    else
      self.open();
  };

  var on_selection = function()
  {
    self.close();

    var s = list_.selection();
    assert(s.length != 0);

    text_.text(s[0].caption(0));
  }

  self.close = function()
  {
    assert(panel_.parent() != undefined);
    
    drop_.pressed(false);
    panel_.remove();
  };

  self.open = function()
  {
    assert(panel_.parent() == undefined);

    var rp = self.get_root_panel();
    assert(rp != undefined);

    var p = new point(
      self.position().x,
      self.position().y + text_.position().y + text_.height());
    p = self.parent().local_to_absolute(p);

    panel_.position(p);
     
    drop_.pressed(true);
    rp.add_floating(panel_);
  };

  init();
},

combobox: function(opts)
{
  ui.inherit_combobox(this, opts);
}

});   // namespace ui
