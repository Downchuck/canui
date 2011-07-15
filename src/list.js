// $Id$

namespace("ui", {

list_lexicographic_sorter: function(a, b, i)
{
  var c1 = a.caption(i);
  var c2 = b.caption(i);

  if (c1 < c2)
    return -1;
  else if (c1 > c2)
    return 1;
  return 0;
},

list_logical_sorter: function(a, b, i)
{
  var c1 = a.caption(i);
  var c2 = b.caption(i);

  return logical_compare(c1, c2);
},

// an item in a list; this contains an array of captions (for the
// columns) and the item state (such as the selection)
//
list_item : function(caption)
{
  // one caption per column
  var captions_ = [];

  // whether the item is currently selected
  var selected_ = false;


  // constructor
  //
  var init = function(captions)
  {
    captions_ = caption;
  };

  // if b is not undefined, sets the selected state; in any case
  // returns the current selected state
  //
  this.selected = function(b)
  {
    if (b != undefined)
      selected_ = b;
    return selected_;
  };

  // if s is not undefined, sets the caption of the column 'i'; this
  // assumes that 'i' is a valid column. In any case returns the
  // current caption of the given column.
  //
  this.caption = function(i, s)
  {
    assert(i >= 0 && i < captions_.length);

    if (s != undefined)
      captions_[i] = s;

    return captions_[i];
  };

  init(caption);
},

// a column in the list
//
list_column: function(caption, width)
{
  var self = this;

  var caption_ = caption;
  var width_ = (width == undefined ? 0 : width);
  var sorter_ = ui.list_logical_sorter;
  var sort_ = 0;

  // constructor
  //
  var init = function()
  {
  };

  self.caption = function(c)
  {
    if (c != undefined)
      caption_ = c;

    return caption_;
  };

  self.width = function(w)
  {
    if (w != undefined)
      width_ = w;

    return width_;
  };

  self.sorter = function(s)
  {
    if (s != undefined)
      sorter_ = s;

    return sorter_;
  }

  self.current_sorter = function(s)
  {
    if (sort_ == 1)
    {
      return sorter_;
    }
    else
    {
      return function(a, b, i)
        {
          return -sorter_(a, b, i);
        };
    }
  }

  self.toggle_sort_direction = function()
  {
    if (sort_ == 1)
      sort_ = -1;
    else
      sort_ = 1;
  }

  self.sort_direction = function(v)
  {
    if (v != undefined)
    {
      assert(v == -1 || v == 0 || v == 1);
      sort_ = v;
    }
    
    return sort_;
  }

  init();
},

// a row of clickable headers
//
list_header: function(parent)
{
  ui.inherit_container(this, {layout: new ui.absolute_layout()});
  var self = this;

  self.clicked = new signal();


  // list object
  var parent_ = parent;

  // header buttons
  var headers_ = undefined;

  // columns
  var cols_ = undefined;


  var init = function()
  {
  };

  // returns the width in pixels of the header for the given column
  //
  self.header_width = function(i)
  {
    if (headers_ == undefined)
      return 0;

    assert(i >= 0 && i < headers_.length);
    return headers_[i].best_dimension().w
  }

  // returns the column index at the given coordinate (relative to
  // this control)
  //
  self.index = function(p)
  {
    var x = 0;
    for (var i=0; i<headers_.length; ++i)
    {
      var c = headers_[i];
      var w = c.width();

      if (p.x >= x && p.x < (x + w))
        return i;

      x += w;
    }

    return -1;
  }

  var set_button = function(b, c)
  {
    var p = new ui.panel({layout: new ui.border_layout()});
    p.add(new ui.label({caption: c.caption()}), ui.sides.center);

    if (c.sort_direction() == -1)
      p.add(new ui.image({image: load_image("up.png", "^")}), ui.sides.right);
    else if (c.sort_direction() == 1)
      p.add(new ui.image({image: load_image("down.png", "v")}), ui.sides.right);

    b.label(p);
  }

  var recreate_buttons = function()
  {
    self.remove_all();
    headers_ = [];

    for (var i=0; i<cols_.length; ++i)
    {
      var c = cols_[i];

      var b = new ui.button();
      b.clicked.add(bind(on_clicked, i));

      headers_.push(b);
      self.add(b);
    }
  }

  self.refresh = function()
  {
    var highest = 0;
    var total_width = 0;
    var x = 0;

    if (headers_ == undefined || (headers_.length != cols_.length))
      recreate_buttons();

    assert(headers_.length == cols_.length);

    for (var i=0; i<headers_.length; ++i)
    {
      var b = headers_[i];
      var c = cols_[i];

      set_button(b, c);

      var bd = b.best_dimension();
      highest = Math.max(highest, bd.h);

      // height will be set after
      b.bounds(new rectangle(x, 0, c.width(), 0));
      
      total_width += c.width();
      x += c.width();
    }

    // setting the height to the highest
    for (var i=0; i<headers_.length; ++i)
    {
      var c = headers_[i];

      var r = c.bounds();
      r.h = highest;

      c.bounds(r);
    }

    self.layout().set_best_dimension(
      new dimension(total_width, highest));
  }

  var on_clicked = function(i)
  {
    self.clicked.fire(i);
  }

  // creates as many buttons are there are captions; all the buttons
  // will have the height of the largest
  //
  self.set = function(cols)
  {
    cols_ = cols;
    self.refresh();

  }

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "list_header";
  }

  init();
},

dragger: function(c)
{
  var self = this;

  self.on_dragging = new signal();

  var control_ = c;
  var origin_ = undefined;
  var tentative_drag_ = false;
  var dragging_ = false;
  var tentative_delta_ = 5;
  var rect_ = undefined;


  self.dragging = function()
  {
    return dragging_;
  }

  self.rect = function()
  {
    return rect_;
  }

  self.on_mouse_left_down = function(mp)
  {
    origin_ = mp;
    tentative_drag_ = true;
    control_.capture_mouse();

    return true;
  }

  self.on_mouse_left_up = function(mp)
  {
    var handled = dragging_;

    if (tentative_drag_ || dragging_)
    {
      control_.release_mouse();
      tentative_drag_ = false;
      dragging_ = false;
      rect_ = undefined;

      return true;
    }

    return handled;
  }

  self.on_mouse_move = function(mp)
  {
    if (!dragging_ && !tentative_drag_)
      return;

    var dx = mp.x - origin_.x;
    var dy = mp.y - origin_.y;

    if (tentative_drag_)
    {
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d > tentative_delta_)
      {
        tentative_drag_ = false;
        dragging_ = true;
      }
    }

    if (dragging_)
    {
      rect_ = new rectangle(
        origin_.x, origin_.y, dx, dy);

      normalize_rectangle(rect_);
      self.on_dragging.fire(rect_);

      return true;
    }
    
    if (tentative_drag_ || dragging_)
      return true;

    return false;
  }
},

// scollable list of items and a clickable header
//
// the list can be frozen so that columns won't be resized immediately
// while adding items; when the resize behaviour is "content", the
// item list would be walked through each time an item is added to
// get the longest item. Freezing the list will defer this until it
// is thawed.
//
// options:
//  item_height (positive integer), default: g_line_height + 4
//    height in pixels of an item; the text will be vertically
//    centered
//
//  padding (positive integer), default: 5
//    space on the left side of the items
//
//  column_resize (none, content, header, auto), default: auto
//    specifies how columns are resized: "content" uses the width of
//    the largest item and therefore might be slow for very long
//    lists; "header" uses the width of the column caption; "none"
//    requires the user to set the width manually; "auto" uses the
//    largest between content and header
//
//  show_header (true/false), default: true
//    whether the column headers should be visible
//
//  expand_header (true/false), default: true
//    whether the last column should be expanded to take the remaining
//    horizontal space
//
//  item_scroll (true/false), default: false
//    whether scrolling is per-pixel or per-item
//
//  track (true/false), default: false
//    the item under the mouse will be automatically selected without
//    having to click
//
list: function(opts)
{
  ui.inherit_container(this,
    merge(opts, {layout: new ui.absolute_layout()}));
  var self = this;


  self.on_item_selection = new signal();
  self.on_item_clicked = new signal();
  self.on_item_double_click = new signal();

  // an array of list_item objects
  var items_ = [];
  
  // an array of list_column objects
  var cols_ = [];

  // header buttons
  var header_ = new ui.list_header(self);

  // vertical scroll bar
  var vert_scroll_ = new ui.scrollbar();

  // scroll offset
  var origin_ = new point(0, 0);

  // when true, prevents updates when adding items
  var frozen_ = false;

  // focused item
  var focus_ = -1;

  var dragger_ = new ui.dragger(self);

  // an item is selected on list button down when the mouse is over
  // the caption, otherwise on button up; this is set to true on
  // mouse down selection so that mouse up doesn't try to do it again
  var selection_handled_ = false;

  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      text_color: ui.theme.text_color(),
      item_height: g_line_height + 4,
      column_resize: "auto",
      show_header: true,
      expand_header: true,
      item_scroll: false,
      track: false,
      padding: 5
    });

    self.borders({"all": 1});

    if (self.option("show_header"))
      self.add(header_, ui.sides.top);

    header_.clicked.add(on_header_clicked);

    vert_scroll_.changed.add(on_vert_scroll);
    vert_scroll_.tick_size(self.option("item_height"));

    dragger_.on_dragging.add(on_dragging);
  };
  
  // adds an item to the list
  //
  self.add_item = function(captions)
  {
    assert(captions.length == cols_.length);

    items_.push(new ui.list_item(captions));

    if (!frozen_)
      update();
  };

  // adds a column
  //
  self.add_column = function(name, width)
  {
    cols_.push(new ui.list_column(name, width));

    if (cols_.length == 1)
      cols_[0].sort_direction(1);

    if (!frozen_)
      update();
  };

  // returns an array of list_item objects
  //
  self.items = function()
  {
    return items_;
  }

  self.frozen = function(b)
  {
    var needs_update = false;
    if (frozen_ && !b)
      needs_update = true;

    frozen_ = b;

    if (needs_update)
      update();
  }

  var on_header_clicked = function(c)
  {
    assert(c >= 0 && c < cols_.length);

    for (var i=0; i<cols_.length; ++i)
    {
      if (i == c)
        cols_[i].toggle_sort_direction();
      else
        cols_[i].sort_direction(0);
    }

    self.sort();
  }

  self.sort = function()
  {
    if (cols_ == undefined)
      return;

    for (var i=0; i<cols_.length; ++i)
    {
      if (cols_[i].sort_direction() != 0)
      {
        items_.sort(bind_3(cols_[i].current_sorter(), i));
        header_.refresh();
        self.redraw();

        break;
      }
    }
  }

  var update = function()
  {
    header_.set(cols_);
    self.sort();
    self.relayout();
  }

  var calculate_header_widths = function(fill)
  {
    var ws = [];
    var total_width = 0;

    var vw = viewport_bounds().w;

    for (var i=0; i<cols_.length; ++i)
    {
      var w = header_.header_width(i);

      ws.push(w);
      total_width += w
    }

    if (fill)
    {
      if (self.option("expand_header") && total_width < vw)
      {
        total_width = 0;
        for (var i=0; i<cols_.length - 1; ++i)
          total_width += ws[i];

        ws[cols_.length - 1] = vw - total_width;
      }
    }

    return ws;
  }

  var calculate_content_widths = function(fill)
  {
    var ws = [];
    var total_width = 0;

    var vw = viewport_bounds().w;

    for (var c=0; c<cols_.length; ++c)
    {
      var largest = 0;

      for (var i=0; i<items_.length; ++i)
      {
        var iw =
          self.option("padding") + 
          text_dimension(items_[i].caption(c), self.font()).w;

        if (c == 0)
          iw += self.option("padding");

        largest = Math.max(largest, iw);
      }

      ws.push(largest);
      total_width += largest;
    }

    if (fill)
    {
      if (self.option("expand_header") && total_width < vw)
      {
        total_width = 0;
        for (var i=0; i<ws.length - 1; ++i)
          total_width += ws[i];

        ws[ws.length - 1] = vw - total_width;
      }
    }

    return ws;
  }

  var calculate_auto_widths = function(fill)
  {
    var hws = calculate_header_widths(fill);
    var cws = calculate_content_widths(fill);
    assert(hws.length == cws.length);

    ws = [];
    var total_width = 0;

    for (var i=0; i<hws.length; ++i)
    {
      var w = Math.max(hws[i], cws[i]);
      ws.push(w);
      total_width += w;
    }

    if (fill)
    {
      var vw = viewport_bounds().w;

      if (self.option("expand_header") && total_width >= vw)
      {
        total_width = 0;
        for (var i=0; i<ws.length - 1; ++i)
          total_width += ws[i];

        ws[ws.length - 1] = vw - total_width;
      }
    }

    return ws;
  }

  var calculate_widths = function(fill)
  {
    if (self.option("column_resize") == "header")
      return calculate_header_widths(fill);
    else if (self.option("column_resize") == "content")
      return calculate_content_widths(fill);
    else if (self.option("column_resize") == "auto")
      return calculate_auto_widths(fill);
    
    return undefined;
  }

  // resizes each column depending on the resize option
  //
  var resize_columns = function()
  {
    if (cols_.length == 0)
      return;
      
    var ws = calculate_widths(true);
    if (ws != undefined)
    {
      for (var i=0; i<ws.length; ++i)
        cols_[i].width(ws[i]);

      header_.refresh();
    }
  }

  // on vertical scroll
  //
  var on_vert_scroll = function(v)
  {
    if (self.option("item_scroll"))
    {
      origin_.y =
        -to_int(v / self.option("item_height")) *
         self.option("item_height");
    }
    else
    {
      origin_.y = -v;
    }

    self.redraw();
  };

  // resizes the columns to fit the list
  //
  self.on_bounds_changed = function()
  {
    if (cols_.length == 0)
      return;

    var header_r = new rectangle(
      1, 1, header_.best_dimension().w, header_.best_dimension().h);
    header_.bounds(header_r);

    var ub = usable_bounds();
    var ld = list_dimension();

    if (ld.h > ub.h)
    {
      if (vert_scroll_.parent() == undefined)
        self.add(vert_scroll_);

      vert_scroll_.bounds(new rectangle(
        self.width() - vert_scroll_.best_dimension().w - 1, 1,
        vert_scroll_.best_dimension().w, self.height() - 2));

      vert_scroll_.limits(0, ld.h - ub.h);
      vert_scroll_.page_size(viewport_bounds().h - self.option("item_height")*2);

      self.relayout();
    }
    else
    {
      if (vert_scroll_.parent() != undefined)
        self.remove_child(vert_scroll_);
    }

    header_.set(cols_);
    resize_columns();

    var header_r = new rectangle(
      1, 1, header_.best_dimension().w, header_.best_dimension().h);
    header_.bounds(header_r);
  }

  // todo: width is missing and this assumes (correctly?) that all
  // columns have the same height
  //
  self.best_dimension = function()
  {
    if (cols_.length == 0)
      return new dimension(100, 100);

    var ld = list_dimension();

    if (self.option("show_header"))
      ld.h += header_.height();

    if (vert_scroll_.parent() != undefined)
      ld.w += vert_scroll_.best_dimension().w;

    // todo: why? border?
    ld.w += 2;
    ld.h += 3;

    return ld;
  };

  self.selection = function()
  {
    var s = [];

    for (var i in items_)
    {
      if (items_[i].selected())
        s.push(items_[i]);
    }

    return s;
  }

  self.selection_indices = function()
  {
    var s = [];

    for (var i=0; i<items_.length; ++i)
    {
      if (items_[i].selected())
        s.push(i);
    }

    return s;
  }

  // selects all the items having the given indices, unselecting
  // the rest
  //
  self.select_only = function(s)
  {
    for (var i in items_)
    {
      assert(items_[i] != undefined)
      items_[i].selected(false);
    }

    for (var i in s)
    {
      assert(s[i] != undefined);
      assert(items_[s[i]] != undefined);

      items_[s[i]].selected(true);
    }

    if (s.length == 0)
      self.focus_item(-1);

    self.on_item_selection.fire();
    self.redraw();
  };

  // selects all the items having the given indices in addition to
  // the ones already selected
  //
  self.select = function(s)
  {
    var changed = false;

    for (var i in s)
    {
      assert(s[i] != undefined);
      assert(items_[s[i]] != undefined);

      var item = items_[s[i]];

      if (!item.selected())
      {
        items_[s[i]].selected(true);
        changed = true;
      }
    }

    if (changed)
    {
      self.on_item_selection.fire();
      self.redraw();
    }
  }

  // inverts the selection state of all the given indices
  //
  self.select_reverse = function(s)
  {
    for (var i in s)
      items_[s[i]].selected(!items_[s[i]].selected());

    self.on_item_selection.fire();
    self.redraw();
  }

  // draws the header and all the items
  //
  self.draw = function(context)
  {
    assert(items_ != undefined);

    self.container__draw(context);

    var r = viewport_bounds();

    context.save();
    clip(context, r);

    fill_rect(context, new color().white(), r);

    r.x += origin_.x + self.option("padding");
    r.y += origin_.y;

    r.w = 0;
    for (var i=0; i<cols_.length; ++i)
      r.w += cols_[i].width();

    r.w -= self.option("padding");

    draw_items(context, r);

    if (dragger_.dragging())
    {
      fill_rect(context, new color(0.03, 0.14, 0.41, 0.2), dragger_.rect());
      outline_rect(context, new color(0.03, 0.14, 0.41), dragger_.rect());
    }

    context.restore();
  };

  var list_dimension = function()
  {
    var w = 0;

    var ws = calculate_widths(false);
    if (ws != undefined)
    {
      for (var i in ws)
        w += ws[i];
    }

    if (w == 0)
      w = 200;
    
    var h = self.option("item_height") * items_.length;
    if (h == 0)
      h = 100;
    
    return new dimension(w, h);
  }

  var usable_bounds = function()
  {
    var y = 1;

    if (self.option("show_header"))
      y += header_.height();

    return new rectangle(
      1, y,
      self.width()-2, self.height() - y - 2);
  }

  var viewport_bounds = function()
  {
    var r = usable_bounds();

    if (vert_scroll_.parent() != undefined)
      r.w -= vert_scroll_.width();

    return r;
  }

  // draws all the items in the given rectangle
  //
  var draw_items = function(context, r)
  {
    var p = new point(r.x, r.y);

    for (var x=0; x<items_.length; ++x)
    {
      var item = items_[x];

      var ir = new rectangle(
        p.x, p.y, r.w, self.option("item_height"));

      draw_item(context, clone(ir), item, x);
      p.y += self.option("item_height");
    }
  };

  // draws the item 'i' in the given rectangle
  //
  var draw_item = function(context, r, item, index)
  {
    // selected items will have a different background and text color

    var c = self.option("text_color");

    if (item.selected())
    {
      fill_rect(context, ui.theme.selected_text_background(), r);
      c = ui.theme.selected_text_color();
    }

    if (focus_ == index)
    {
      var fc = undefined;
      if (items_[focus_].selected())
        fc = color_inverse(ui.theme.selected_text_background());
      else
        fc = new color().black();

      dotted_rect(context, fc, r);
    }

    var x = r.x;
    r.y = r.y + r.h/2 - g_line_height/2;
    var tw = 0;

    for (var j=0; j<cols_.length; ++j)
    {
      r.x = x + tw + self.option("padding");
      r.w = cols_[j].width() - self.option("padding");

      draw_text(context, item.caption(j), c, r, self.font());
      tw += r.w;
    }
  };

  self.focus_item = function(i)
  {
    assert(i >= -1 && i < items_.length);
    focus_ = i;
  }

  var on_dragging = function(r)
  {
    var hta = self.hit_test(new point(r.x, r.y));
    var htb = self.hit_test(new point(r.x + r.w - 1, r.y + r.h - 1));
    var a = -1, b = -1;

    if (hta.column != -1)
    {
      if (hta.part == "above")
        a = 0;
      else
        a = hta.item;
    }

    if (htb.part == "below")
      b = items_.length - 1;
    else
      b = htb.item;

    var s = [];

    if (a != -1 && b != -1)
    {
      for (var i=a; i<=b; ++i)
        s.push(i);
    }

    handle_selection(s, false);
    /*self.select_only(s);

    if (a != -1)
      self.focus_item(a);
      */
    self.redraw();
  }

  // scrolls the list
  //
  self.on_mouse_scroll = function(delta)
  {
    if (vert_scroll_.parent() != undefined)
      vert_scroll_.scroll_by(-delta * self.option("item_height"));

    return true;
  }

  self.on_mouse_left_down = function(mp)
  {
    var ht = self.hit_test(mp);

    if (ht.part == "caption")
    {
      handle_click_selection(ht.item);
      selection_handled_ = true;
    }
    else
    {
      if (!self.option("track"))
        dragger_.on_mouse_left_down(mp);
    }

    return true;
  }

  // selects the item under the mouse, if any
  //
  self.on_mouse_left_up = function(mp)
  {
    var i = self.find_item(mp);
    assert(i != undefined);

    if (!dragger_.dragging())
    {
      if (!selection_handled_)
        handle_click_selection(i);

      if (i != -1)
        self.on_item_clicked.fire(items_[i]);
    }

    selection_handled_ = false;
    dragger_.on_mouse_left_up(mp);
    self.redraw();

    return true;
  }

  self.on_mouse_move = function(mp)
  {
    if (self.option("track"))
    {
      var ht = self.hit_test(mp);

      if (ht.part == "before" || ht.part == "caption" ||
          ht.part == "nowhere" || ht.part == "after")
      {
        self.select_only([ht.item]);
      }
      else
      {
        self.select_only([]);
      }
    }
    else
    {
      return dragger_.on_mouse_move(mp);
    }
  }

  self.on_double_click = function(mp)
  {
    var i = self.find_item(mp);
    
    if (i != -1)
      self.on_item_double_click.fire(items_[i]);

    return true;
  }

  var handle_click_selection = function(i)
  {
    var sel = [];
    var rp = self.get_root_panel();

    if (rp.key_state(ui.key_codes.shift) && focus_ != -1)
    {
      var a = focus_;
      var b = i;

      if (a > b)
      {
        var temp = a;
        a = b;
        b = temp;
      }

      if (a != -1 && b != -1)
      {
        for (var x=a; x<=b; ++x)
          sel.push(x);
      }
    }
    else
    {
      if (i != -1)
        sel = [i];
    }

    handle_selection(sel, true);
  }

  var handle_selection = function(sel, ctrl_reverses)
  {
    var rp = self.get_root_panel();

    if (rp.key_state(ui.key_codes.ctrl) || rp.key_state(ui.key_codes.shift))
    {
      if (sel.length == 0)
        return;
    }

    if ((rp.key_state(ui.key_codes.ctrl) && rp.key_state(ui.key_codes.shift)))
    {
      self.select(sel);
    }
    else if (!ctrl_reverses && (rp.key_state(ui.key_codes.ctrl) || rp.key_state(ui.key_codes.shift)))
    {
      self.select(sel);
    }
    else if (rp.key_state(ui.key_codes.ctrl))
    {
      self.select_reverse(sel);

      if (sel.length > 0)
        self.focus_item(sel[0]);
    }
    else if (rp.key_state(ui.key_codes.shift))
    {
      self.select_only(sel);
    }
    else
    {
      self.select_only(sel);

      if (sel.length != 0)
        self.focus_item(sel[0]);
    }

    self.redraw();
  }

  // returns the specific part of the list that's under the given
  // point, relative to this control:
  //
  //   {
  //     item: the index of the item, -1 if none; this is set even if
  //           the cursor is outside the item but aligned with it
  // 
  //     column: the index of the column, -1 if none; this is set
  //             even if the cursor is not over an item
  //
  //     part: one of:
  //       above:   the point is above the first item (such as between
  //                the header and the first item)
  //       below:   the point is below the last item
  //       before:  the point is in the margin before the start of the
  //                item (up to the start of the focus ring)
  //       caption: the point is on the caption of an item (that is,
  //                there is text under the cursor)
  //       nowhere: the point is inside a column, but not over a
  //                caption (such as in the space between two captions
  //                on the same line)
  //       after:   the point is after the last column
  //  }
  //  
  self.hit_test = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    var ht = {item: -1, column: -1, part: ""};
    var rp = new point(p.x, p.y);

    // skip the header
    if (self.option("show_header"))
      rp.y -= header_.height();

    // scrolling
    rp.x -= origin_.x;
    rp.y -= origin_.y;

    var i = to_int(rp.y / self.option("item_height"));
    if (i >= 0 && i < items_.length)
    {
      ht.item = i;
    }
    else
    {
      if (i < 0)
        ht.part = "above";
      else
        ht.part = "below";

      return ht;
    }

    var cx = 0;
    for (var c=0; c<cols_.length; ++c)
    {
      var cr = new rectangle(
        cx, i * self.option("item_height"),
        cols_[c].width(), self.option("item_height"));

      if (rp.x < (cr.x + cr.w))
      {
        var crp = new point(rp.x - cr.x, rp.y - cr.y);
        ht.column = c;

        if (crp.x < self.option("padding"))
        {
          ht.part = "before";
          return ht;
        }

        crp.x -= self.option("padding");

        if (crp.x < self.option("padding"))
        {
          ht.part = "nowhere";
          return ht;
        }

        crp.x -= self.option("padding");

        var cw = text_dimension(items_[i].caption(c), self.font()).w;
        if (crp.x < cw)
        {
          ht.part = "caption";
          return ht;
        }

        ht.part = "nowhere";
        return ht
      }

      cx += cr.w;
    }

    ht.part = "after";
    return ht;
  }

  // returns the index of the given item or -1
  //
  var item_index = function(item)
  {
    for (var i=0; i<items_.length; ++i)
    {
      if (items_[i] == item)
        return i;
    }

    return -1;
  }

  // returns the index of the item at the given point (relative to
  // this control) or -1
  //
  self.find_item = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    var ht = self.hit_test(p);
    assert(ht.item != undefined);

    if (ht.part == "nowhere" || ht.part == "caption")
      return ht.item;

    return -1;
  };

  // returns the index of the column at the given point (relative to
  // this control) or -1
  //
  var find_column = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    var ht = self.hit_test(p);
    if (ht.part != "")
      return ht.column;
  }
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "list";
  };

  init();
}

});   // namespace ui
