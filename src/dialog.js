// $Id$

namespace("ui", {

dialog_borders:
{
  top:    0x01,
  right:  0x02,
  bottom: 0x04,
  left:   0x08
},

titlebar: function(d, opts)
{
  ui.inherit_container(this, merge(opts, {
    layout: new ui.border_layout({margin: 2})}));
  var self = this;
  self.internal_is_a_titlebar = true;

  self.minimize = new signal();
  self.restore = new signal();
  self.close = new signal();

  var dialog_ = d;
  var caption_ = new ui.label();

  var buttons_ = undefined;
  var close_ = new ui.button();
  var restore_ = new ui.button();
  var minimize_ = new ui.button();

  var dragging_ = false;
  var drag_start_ = undefined;
  var original_ = undefined;

  var init = function()
  {
    self.set_default_options({
      caption: "",
      closable: true,
      maximizable: true,
      minimizable: true
    });

    caption_.transparent(true);
    caption_.font().bold(true);
    caption_.caption(self.option("caption"));
    caption_.option("color", ui.theme.selected_text_color());

    minimize_.option("small", true);
    minimize_.layout().option("margin", 2);
    minimize_.label(new ui.image({image: load_image("minimize.png", "_")}));
    minimize_.clicked.add(function()
      {
        self.minimize.fire();
      });

    restore_.option("small", true);
    restore_.layout().option("margin", 2);
    restore_.label(new ui.image({image: load_image("maximize.png", "M")}));
    restore_.clicked.add(function()
      {
        self.restore.fire();
      });

    close_.option("small", true);
    close_.layout().option("margin", 2);
    close_.label(new ui.image({image: load_image("close.png", "x")}));
    close_.clicked.add(function()
      {
        self.close.fire();
      });

    buttons_ = new ui.panel({
      layout: new ui.horizontal_layout({padding: 2}),
      background: new color().transparent()});
    buttons_.transparent(true);

    self.add(caption_, ui.sides.left);
    self.add(buttons_, ui.sides.right);
  };
  
  self.best_dimension = function()
  {
    return new dimension(0, 18);
  };

  self.draw = function(context)
  {
    fill_rect(context, ui.theme.selected_text_background(), self.bounds());
    self.container__draw(context);
  };

  self.option = function(n, v)
  {
    var r = self.control__option(n, v);

    if (v != undefined)
    {
      if (n == "closable" || n == "maximizable" || n == "minimizable")
        set_buttons();
    }

    return r;
  };

  var set_buttons = function()
  {
    buttons_.remove_all();

    //if (self.option("minimizable"))
    //  buttons_.add(minimize_);

    //if (self.option("maximizable"))
    //  buttons_.add(restore_);

    if (self.option("closable"))
      buttons_.add(close_);
  };

  self.on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    assert(!dragging_);
    dragging_ = true;
    drag_start_ = self.local_to_absolute(mp);
    original_ = dialog_.position();

    self.capture_mouse();
  };

  self.on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (dragging_)
    {
      self.release_mouse();
      dragging_ = false;
      drag_start_ = undefined;
      original_ = undefined;
    }
  };

  self.on_mouse_move = function(mp)
  {
    if (dragging_)
    {
      var p = self.local_to_absolute(mp);

      var dx = p.x - drag_start_.x;
      var dy = p.y - drag_start_.y;

      dialog_.position(new point(original_.x + dx, original_.y + dy));
    }

    self.control__on_mouse_move(mp);
  };

  self.typename = function()
  {
    return "titlebar";
  };

  init();
},

// options:
//  closable (true/false), default: true
//  whether the close button is displayed on the titlebar
//
//  maximizable (true/false), default: true
//  whether the maximize/restore button is displayed on the titlebar
//
//  minimizable (true/false), default: true
//  whether the minimize button is displayed on the titlebar
//
//  resizable (true/false), default: true
//  whether the borders can be dragged to resize the dialog
//
inherit_dialog: function(self, opts)
{
  ui.inherit_container(self, merge(opts, {
    layout: new ui.border_layout({margin: 4, padding: 1})}));

  self.internal_is_a_dialog = true;

  self.closed = new signal();

  var title_ = new ui.titlebar(self, {caption: "test"});
  var pane_ = new ui.panel();
  var border_ = 4;

  var resizing_ = 0;
  var original_bounds_ = undefined;
  var original_mouse_ = undefined;

  var init = function()
  {
    self.set_default_options({
      closable: true,
      maximizable: true,
      minimizable: true,
      resizable: true
    });

    title_.option("closable", self.option("closable"));
    title_.option("maximizable", self.option("maximizable"));
    title_.option("minimizable", self.option("minimizable"));
    
    title_.close.add(function()
      {
        self.closed.fire();
      });

    title_.restore.add(function()
      {
      });

    title_.minimize.add(function()
      {
      });

    self.container__add(title_, ui.sides.top);
    self.container__add(pane_, ui.sides.center);

    //todo
    if (opts != undefined && opts.layout != undefined)
      pane_.layout(opts.layout);
  };

  self.dialog__option = function(n, v)
  {
    var r = self.control__option(n, v);

    if (v != undefined)
    {
      if (n == "closable" || n == "maximizable" || n == "minimizable")
        title_.option(n, v);
    }

    return r;
  }

  self.dialog__best_dimension = function()
  {
    var d = self.container__best_dimension();
    d.w = Math.max(d.w, 60);
    d.h = Math.max(d.h, 20);

    return d;
  };

  self.dialog__add = function(c, w)
  {
    return pane_.add(c, w);
  }

  self.dialog__remove_child = function(c)
  {
    return pane_.remove(c);
  }

  self.dialog__remove_all = function()
  {
    return pane_.remove_all();
  }

  self.dialog__draw = function(context)
  {
    fill_3d_rect(context, true, false, self.bounds())

    self.container__draw(context);
  };

  self.dialog__on_mouse_move = function(mp)
  {
    self.control__on_mouse_move(mp);

    if (resizing_ != 0)
    {
      mp.x += self.position().x;
      mp.y += self.position().y;

      var b = resized_bounds(mp);
      self.bounds(b);
    }
    else
    {
      var h = hit_test(mp);
      self.cursor(make_cursor(h));
    }
  };

  self.dialog__on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    assert(resizing_ == 0);

    resizing_ = hit_test(mp);
    if (resizing_ == 0)
      return;

    self.capture_mouse();
    original_bounds_ = self.bounds();
    original_mouse_ = mp;
    original_mouse_.x += self.position().x;
    original_mouse_.y += self.position().y;
  };

  self.dialog__on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (resizing_)
    {
      resizing_ = 0;
      self.release_mouse();
      original_bounds_ = undefined;
      original_mouse_ = undefined;
    }
  };

  var resized_bounds = function(mp)
  {
    assert(resizing_ != 0);

    var top=0, right=0, bottom=0, left=0;

    if (resizing_ & ui.dialog_borders.top)
      top = mp.y - original_mouse_.y;
    else if (resizing_ & ui.dialog_borders.bottom)
      bottom = mp.y - original_mouse_.y;

    if (resizing_ & ui.dialog_borders.left)
      left = mp.x - original_bounds_.x;
    else if (resizing_ & ui.dialog_borders.right)
      right = mp.x - original_mouse_.x;

    return new rectangle(
      original_bounds_.x + left, original_bounds_.y + top,
      original_bounds_.w - left + right,
      original_bounds_.h - top + bottom);
  };

  var make_cursor = function(h)
  {
    if ((h == (ui.dialog_borders.top | ui.dialog_borders.left)) ||
        (h == (ui.dialog_borders.bottom | ui.dialog_borders.right)))
    {
      return "nw-resize";
    }
    else if ((h == (ui.dialog_borders.top | ui.dialog_borders.right)) ||
             (h == (ui.dialog_borders.bottom | ui.dialog_borders.left)))
    {
      return "ne-resize";
    }
    else if (h & (ui.dialog_borders.top | ui.dialog_borders.bottom))
    {
      return "n-resize";
    }
    else if (h & (ui.dialog_borders.left | ui.dialog_borders.right))
    {
      return "e-resize";
    }

    return "default";
  };

  var hit_test = function(mp)
  {
    var r = 0;

    if (!self.option("resizable"))
      return 0;

    var top = new rectangle(0, 0, self.width(), border_);
    var right = new rectangle(self.width() - border_ - 1, 0, border_, self.height());
    var bottom = new rectangle(0, self.height() - border_ - 1, self.width(), border_);
    var left = new rectangle(0, 0, border_, self.height());

    if (in_rectangle(mp, top))
      r |= ui.dialog_borders.top;
    if (in_rectangle(mp, right))
      r |= ui.dialog_borders.right;
    if (in_rectangle(mp, bottom))
      r |= ui.dialog_borders.bottom;
    if (in_rectangle(mp, left))
      r |= ui.dialog_borders.left;

    return r;
  };

  self.typename = function()
  {
    return "dialog";
  }


  self.option               = self.dialog__option
  self.best_dimension       = self.dialog__best_dimension;
  self.draw                 = self.dialog__draw;
  self.on_mouse_move        = self.dialog__on_mouse_move;
  self.on_mouse_left_down   = self.dialog__on_mouse_left_down;
  self.on_mouse_left_up     = self.dialog__on_mouse_left_up;
  self.add                  = self.dialog__add;
  self.remove_child         = self.dialog__remove_child;
  self.remove_all           = self.dialog__remove_all;

  init();
},

dialog: function(opts)
{
  ui.inherit_dialog(this, opts);
}

});
