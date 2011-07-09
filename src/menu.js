// $Id$

namespace("ui", {

menu_button: function(parent, caption)
{
  ui.inherit_control(this);

  var self = this;
  
  self.hovered = new signal();
  self.left = new signal();
  self.down = new signal();
  self.selected = new signal();

  var parent_ = parent;
  var caption_ = caption;
  var hovered_ = false;
  var active_ = false;

  var init = function()
  {
    self.set_default_options(
      {margin: {left: 18, top: 3, right: 18, bottom: 3},
       bar_margin: 3,
       arrow_margin: 7});
  };

  self.active = function(b)
  {
    active_ = b;
    self.redraw();
  }

  self.best_dimension = function()
  {
    var d = new dimension(
      text_dimension(caption_, self.font()).w, g_line_height);

    if (is_on_bar())
    {
      d.w += self.option("bar_margin")*2;
      d.h += self.option("bar_margin")*2;
    }
    else
    {
      d.w += self.option("margin").left + self.option("margin").right;
      d.h += self.option("margin").top + self.option("margin").bottom;
    }

    return d;
  }

  self.on_mouse_enter = function(mp)
  {
    self.control__on_mouse_enter(mp);
    self.hovered.fire();
    hovered_ = true;
    self.redraw();
  };

  self.on_mouse_leave = function(mp)
  {
    self.control__on_mouse_leave(mp);
    hovered_ = false;
    self.redraw();
    self.left.fire();
  }

  self.on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);
    self.redraw();
    self.down.fire();
  };

  self.on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);
    self.selected.fire();
  };

  var is_on_bar = function()
  {
    return (parent_.parent_menu() == parent_.bar());
  }

  self.draw = function(context)
  {
    var c = ui.theme.text_color();
    var b = self.bounds();

    if (!is_on_bar())
    {

      if (hovered_ || (active_ && parent_.menu_count() > 0))
      {
        fill_rect(context, ui.theme.selected_text_background(), b);
        c = ui.theme.selected_text_color();
      }
      else
      {
        c = ui.theme.text_color();
      }
    }
    else
    {
      if (active_)
        fill_3d_rect(context, false, false, self.bounds());
      else if (hovered_)
        fill_3d_rect(context, true, false, self.bounds());
    }

    var cw = text_dimension(caption_, self.font()).w;
    var r = clone(b);

    r.y = r.y + r.h/2 - g_line_height/2;
    r.h = g_line_height;

    if (is_on_bar())
    {
      r.x = r.x + r.w/2 - cw/2;
      r.w = cw;
    }
    else
    {
      r.x += self.option("margin").left;
      r.w -= self.option("margin").left;
    }

    if (parent_.menu_count() > 0 && !is_on_bar())
    {
      // todo
      var i = new Image();

      if (hovered_ || active_)
        i.src = image_dir() + "/right-white.png";
      else
        i.src = image_dir() + "/right.png";

      if (i.complete)
      {
        var ir = new rectangle(
          b.x + b.w - i.width - self.option("arrow_margin"),
          b.y + b.h/2 - i.height/2,
          i.width, i.height);

        draw_image(context, i, ir);
      }

      require_loaded(i, function()
        {
          self.redraw();
        });
    }

    draw_text(context, caption_, c, r, self.font());
  };
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "menu_button";
  };

  init();
},

menu: function(opts)
{
  ui.inherit_basic_panel(this, 
    merge(opts, {layout: new ui.horizontal_layout({margin: 1})}));
  var self = this;

  self.clicked = new signal();

  self.internal_is_a_menu = true;

  var caption_ = "";
  var parent_ = undefined;
  var menus_ = [];
  var opened_ = undefined;


  var init = function()
  {
    self.set_default_options({
      caption: "",
      click: undefined
    });

    if (self.option("caption") != "")
      caption_ = self.option("caption");

    if (self.option("click") != undefined)
      self.option("click").add(opts.click);

    self.borders({bottom: 1});
    self.option("background", ui.theme.panel_color());
  }

  self.bar = function()
  {
    if (parent_ == undefined)
      return self;

    return parent_.bar();
  }

  self.menu_count = function()
  {
    return menus_.length;
  }

  self.parent_menu = function()
  {
    return parent_;
  }

  self.caption = function(s)
  {
    if (s != undefined)
      caption_ = s;

    return caption_;
  }

  self.add_menu = function(m)
  {
    assert(m != undefined && m.internal_is_a_menu);
    
    m.internal_set_parent_menu(self);
    m.borders({all: 1});

    menus_.push(m);

    layout_buttons();
  }

  self.best_dimension = function()
  {
    var bd = self.container__best_dimension();
    bd.w = Math.max(bd.w, 20);
    bd.h = Math.max(bd.h, 20);

    return bd;
  }

  self.internal_set_parent_menu = function(m)
  {
    assert(parent_ == undefined);
    parent_ = m;

    if (parent_ == undefined)
      return;

    self.layout(new ui.vertical_layout({margin: 2, padding: 0, expand: true}));
  }

  var layout_buttons = function()
  {
    self.remove_all();

    for (var i in menus_)
    {
      var m = menus_[i];
      make_menu_button(m);
    }
  }

  var make_menu_button = function(m)
  {
    var b = new ui.menu_button(m, m.caption());

    //b.label().option("halign", "left");
    
    b.down.add(bind(on_open_menu, b, m));
    b.selected.add(bind(on_select_menu, b, m));
    b.hovered.add(bind(on_menu_hovered, b, m));
    b.left.add(bind(on_menu_left, b, m));

    self.add(b);
  }

  var on_menu_hovered = function(b, m)
  {
    var o = opened_;

    if (opened_ != undefined)
    {
      if (m == opened_.menu)
        return;

      self.close();
    }

    if (o != undefined || m.parent_menu() != self.bar())
      open(b, m);
  };

  var on_menu_left = function(b, m)
  {
   // if (self != self.bar() && opened_ != undefined)
   //   self.close();
  };

  var on_open_menu = function(b, m)
  {
    if (opened_ != undefined)
    {
      var o = opened_.menu;

      if (self == self.bar())
        self.close();

      if (o == m)
        return;
    }

    open(b, m);
  }

  var on_select_menu = function(b, m)
  {
    if (m.menu_count() == 0)
    {
      self.bar().close();
      m.clicked.fire();
    }
  }

  var open = function(b, m)
  {
    assert(opened_ == undefined);

    if (m.menu_count() > 0)
    {
      var rp = self.get_root_panel();
      assert(rp != undefined);

      var p = self.local_to_absolute(b.position());

      if (self == self.bar())
      {
        p.y += b.height();
      }
      else
      {
        p.x += b.width() - 4;
        p.y -= 4;
      }

      var bd = m.best_dimension();

      m.bounds(new rectangle(p.x, p.y, bd.w, bd.h));

      rp.add_floating(m);
    }

    b.active(true);
    opened_ = {button: b, menu: m};
  }

  self.close = function()
  {
    if (opened_ == undefined)
      return;

    opened_.button.active(false);

    if (opened_.menu.parent() != undefined)
      opened_.menu.remove();

    opened_.menu.close();
    opened_ = undefined;
  }
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    if (parent_ == undefined)
      return "menubar";
    else
      return "menu";
  };

  init();
}


});   // namespace ui
