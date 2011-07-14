// $Id$

namespace("ui", {

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
      cb_.toggle();
      return true;
    }
    else
    {
      return self.textbox__on_mouse_left_down(mp);
    }
  }

  self.on_double_click = function(mp)
  {
    if (self.option("unresponsive"))
    {
      cb_.focus();
      return true;
    }

    return self.textbox__on_mouse_double_click(mp);
  };
},

// options:
//   dropstyle (edit, list), default: list
//     if 'edit', the textbox is editable
//
inherit_combobox: function(self, opts)
{
  ui.inherit_container(self, merge(opts,
    {layout: new ui.border_layout({margin: 1, padding: 1})}));
  
  var text_ = new ui.cb_text(self);
  var drop_ = new ui.button({toggle: true, fast: true});
  var list_ = new ui.list({
    show_header: false, track: true, padding: 2,
    expand_header: true
    });
  var panel_ = new ui.cb_panel(self, list_);

  var completing_ = false;
  var last_text_ = "";
  var selection_ = -1;
  
  var search_ = "";
  var last_search_time_ = 0;
  var search_delay_ = 1000;

  var init = function()
  {
    self.set_default_options({
      dropstyle: "list"
    });

    self.needs_focus(true);
    self.borders({all: 1});

    var i = new ui.image({image: load_image("down.png", "v")});
    drop_.label(i);
    drop_.down.add(on_drop);

    text_.minimum_size(new dimension(10, 1));
    text_.changed.add(on_text_changed);

    if (self.option("dropstyle") == "list")
      text_.option("unresponsive", true);

    text_.borders({all: 0});

    self.add(text_, ui.sides.center);
    self.add(drop_, ui.sides.right);
    panel_.add(list_, ui.sides.center);
    
    list_.add_column("");

    list_.on_item_clicked.add(on_selection);
  };

  self.add_item = function(s)
  {
    list_.add_item([s]);
  }

  self.select = function(i)
  {
    if (i < 0 || i >= list_.items().length)
      return;

    selection_ = i;

    text_.text(list_.items()[i].caption(0));
    text_.select_all();
  }

  var on_drop = function()
  {
    self.toggle();
  };

  var on_selection = function()
  {
    self.close();

    var s = list_.selection_indices();
    assert(s.length != 0);

    self.select(s[0]);
  };

  self.on_focus = function()
  {
    self.control__on_focus();
    text_.option("background", ui.theme.selected_text_background());
    text_.option("text_color", ui.theme.selected_text_color());
  };

  self.on_blur = function()
  {
    self.control__on_blur();
    text_.option("background", new color().white());
    text_.option("text_color", ui.theme.text_color());
  }

  self.on_keypress = function(code)
  {
    if (code == 0 || contains(ui.key_codes, code))
      return true;

    var now = new Date().getTime();
    if (now - last_search_time_ > search_delay_)
      search_ = "";

    search_ += String.fromCharCode(code);

    var start = selection_;
    if (start < 0)
      start = 0;

    var i = search(search_, start);
    if (i == -1 && start != 0)
      i = search(search_, 0);

    if (i != -1)
      self.select(i);

    last_search_time_ = now;
  }

  var search = function(s, from)
  {
    var items = list_.items();
    for (var i=from; i<items.length; ++i)
    {
      var item = items[i];

      if (starts_with(item.caption(0), s))
        return i;
    }

    return -1;
  }

  self.on_keydown = function(code)
  {
    switch(code)
    {
      case ui.key_codes.down:
      {
        self.select(selection_ + 1);
        break;
      }

      case ui.key_codes.up:
      {
        self.select(selection_ - 1);
        break;
      }
    }

    return true;
  }

  var on_text_changed = function()
  {
    assert(self.option("dropstyle"));

    if (completing_)
      return;

    var s = text_.selection();
    var t = text_.text();

    if (s.first == s.last)
    {
      if (s.first == t.length && t.length > last_text_.length)
      {
        for (var i=0; i<list_.items().length; ++i)
        {
          var item = list_.items()[i];

          if (starts_with(item.caption(0), t))
          {
            completing_ = true;
            
            text_.text(item.caption(0));
            text_.selection(text_.text().length, s.first);

            completing_ = false;

            break;
          }
        }
      }
    }

    last_text_ = t;
  };

  self.toggle = function()
  {
    if (panel_.parent() != undefined)
      self.close();
    else
      self.open();
  };

  self.close = function()
  {
    assert(panel_.parent() != undefined);
    
    drop_.pressed(false);
    panel_.remove();

    if (self.option("dropstyle") == "edit")
      text_.focus();
    else
      self.focus();
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

  self.typename = function()
  {
    return "combobox";
  }

  init();
},

combobox: function(opts)
{
  ui.inherit_combobox(this, opts);
}

});   // namespace ui
