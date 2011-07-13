// $Id$

namespace("ui",
{

// control for text entry
//
// this emulates double clicks because it acts on the second left
// button down, not up (so word selection can take place)
//
// options:
// text (string), default: ""
//   initial value
//
// margin (positive integer), default: 2
//   space on either side of the text
//
// text_color (color object), default: ui.theme.text_color()
//   color of the text
//
// background (color object), default: new color().white()
//   color of the text background
//
// selected_text_color (color object),
// default: ui.theme.selected_text_color()
//   color of the selected text
//
// selected_text_background (color object),
// default: ui.theme.selected_text_background()
//   color of the selected text background
//
// unresponsive (true/false), default: false
//   when true, the textbox behaves like a label but does not change
//   its appearance (in contrast with being disabled)
//
inherit_textbox: function(self, opts)
{
  ui.inherit_container(self, merge(opts,
    {layout: new ui.border_layout()}));


  // fired when the content changes
  self.changed = new signal();

  // fired when the selection changes
  self.selection_changed = new signal();


  // caret timer
  var caret_timer_ = undefined;

  // if true, caret is drawn; changed in timer
  var caret_ = false;

  // selection
  var sel_ = {first: 0, last: 0};

  // true when the left mouse button is down once but not released;
  // this will select characters on mouse moves
  var selecting_char_ = false;

  // true when the left mouse button is down twice quickly but not
  // released on the second time; this will select words on mouse
  // moves
  var selecting_word_ = false;

  // selection right after the word selection starts; the mouse over
  // behaviour is different over the original word
  var original_word_ = undefined;

  // last time the left mouse button was down; this is used for the
  // double click
  var last_left_down_time_ = 0;

  // last position of the left button down event
  var last_left_down_ = new point(0, 0);

  // number of clicks that are between the double click delay; this
  // allows for triple clicks
  var click_count_ = 0;

  // delay between two left down for a double click
  // todo: ugh, can't we get the system specific delay?
  var double_click_delay_ = 300;

  // maximum distance in pixels between two clicks for a double click
  var double_click_distance_ = 4;

  // text buffer
  var text_ = "";

  // minimum size in characters
  var minimum_ = new dimension(0, 0);

  var hbar_ = new ui.scrollbar();
  var vbar_ = new ui.scrollbar();


  var init = function()
  {
    self.set_default_options({
      text: "",
      margin: 2,
      text_color: ui.theme.text_color(),
      background: new color().white(),
      selected_text_color: ui.theme.selected_text_color(),
      selected_text_background: ui.theme.selected_text_background(),
      unresponsive: false
    });

    self.borders({all: 1});

    hbar_.visible(false);
    vbar_.visible(false);

    self.needs_focus(true);

    if (!self.option("unresponsive"))
      self.cursor("text");

    if (self.option("text") != undefined)
      self.text(self.option("text"));
  };

  self.option = function(n, v)
  {
    if (n == "unresponsive" && v != undefined)
    {
      if (v)
        self.cursor("default");
      else
        self.cursor("text");
    }

    return self.control__option(n, v);
  };
  
  // if 'd' is not undefined, sets the minimum size (best dimension)
  // in characters and lines of this textbox; in any case, returns
  // the current minimum size
  //
  self.textbox__minimum_size = function(d)
  {
    if (d != undefined)
    {
      minimum_ = d;
      self.relayout();
    }

    return minimum_;
  }

  // todo
  //
  self.textbox__best_dimension = function()
  {
    var r = text_rectangle();

    var m = new dimension(
      text_dimension("W", self.font()).w * minimum_.w,
      (g_line_height + g_line_spacing) * minimum_.h);

    r.w = Math.max(r.w, m.w);
    r.h = Math.max(r.h, m.h);

    return new dimension(
      r.w + self.option("margin")*2,
      r.h + self.option("margin")*2);
  };

  var text_rectangle = function()
  {
    var lines = explode(text_, "\n");
    var w = 0;

    for (var i in lines)
    {
      var line = lines[i];
      w = Math.max(w, text_dimension(line, self.font()).w);
    }

    return new rectangle(0, 0, w, lines.length * (g_line_height + g_line_spacing));
  }


  self.textbox__draw = function(context)
  {
    // todo: this is a larger problem: borders are often not taken
    // into account, needs a more generic way
    fill_rect(context, self.option("background"), deflate(self.bounds(), 1));

    // top-left of the string
    var p = new point(
      self.position().x + self.option("margin"),
      self.position().y + self.option("margin"));

    var lines = explode(text_, "\n");
    var s = normalized_selection();
    var count = 0;
    var in_selection = false;

    for (var i in lines)
    {
      var line = lines[i];

      if (!in_selection && s.first >= count)
        in_selection = true;
      else if (in_selection && s.last < count)
        in_selection = false;

      if (s.first != s.last && in_selection &&
          !self.option("unresponsive"))
      {
        var first = Math.max(0, s.first - count);
        var last = Math.min(line.length, s.last - count);

        var before = line.substring(0, first);
        var sel = line.substring(first, last);
        var after = line.substring(last);

        var before_w = text_dimension(before, self.font()).w
        var sel_w = text_dimension(sel, self.font()).w;
        var after_w = text_dimension(after, self.font()).w;

        var sr = new rectangle(
          p.x + before_w, p.y,
          sel_w + 1, g_line_height + g_line_spacing);

        if (last - first > 0)
        {
          fill_rect(
            context, self.option("selected_text_background"), sr);
        }

        draw_text(
          context, before, new color().black(),
          new rectangle(p.x, p.y, before_w, g_line_height),
          self.font());

        draw_text(
          context, sel, new color().white(),
          new rectangle(p.x + before_w, p.y, sel_w, g_line_height),
          self.font());

        draw_text(
          context, after, new color().black(),
          new rectangle(
            p.x + before_w + sel_w, p.y, after_w, g_line_height),
          self.font());
      }
      else
      {
        draw_text(
          context, line, new color().black(),
          new rectangle(
            p.x, p.y,
            self.width() - self.option("margin")*2,
            g_line_height),
          self.font()); 
      }

      count += line.length + 1;
      p.y += g_line_height + g_line_spacing;
    }

    draw_caret(context);
  };

  // returns the y position of the top of the string (where the caret
  // also is)
  //
  var text_y = function()
  {
    return self.position().y;// + self.height()/2 - g_line_height/2;
  };

  // draws the caret if the control has focus and the caret tick is
  // on (changes on and off in a timer); the caret is always past the
  // last character of the selection
  //
  var draw_caret = function(context)
  {
    if (!self.is_focused() || !caret_)
      return;

    var p = new point(self.position().x, self.position().y);

    var this_line = "";
    for (var i=0; i<sel_.last; ++i)
    {
      if (text_[i] == "\n")
      {
        p.y += g_line_height + g_line_spacing;
        this_line = "";
      }
      else
      {
        this_line += text_[i];
      }
    }

    p.x += text_dimension(this_line, self.font()).w;

    p.x += self.option("margin");
    p.y += self.option("margin");

    var c = new color().black();
    if (sel_.last != sel_.first)
      c = new color(0.95, 0.85, 0.58);

    draw_line(context, c, new rectangle(
      p.x, p.y, 1, g_line_height));
  }

  // if first is not undefined, selects the given range (clamped to
  // [0, text().length]); if first is not undefined and last is
  // undefined or the same as first, this sets the caret to the given
  // position. note that the caret will always be at 'last', even if
  // it is lower than 'first'
  //
  // in any case, returns the current selection as an object
  // {first: n, last: n}
  //
  self.textbox__selection = function(first, last)
  {
    if (first != undefined)
    {
      if (last == undefined)
        last = first;

      change(undefined, {first: first, last: last});
    }

    return {first: sel_.first, last: sel_.last};
  };

  // selects all the characters; the caret is put at the end
  //
  self.textbox__select_all = function()
  {
    change(undefined, {first: 0, last: text_.length});
  }

  // returns the selection where 'first' is always lower than 'last'
  //
  var normalized_selection = function()
  {
    if (sel_.first < sel_.last)
      return {first: sel_.first, last: sel_.last};
    else
      return {first: sel_.last, last: sel_.first};
  }

  // replaces the selection with the given text; if there is no
  // selection, inserts the given text at the caret position. this
  // leaves the caret at its lowest position
  //
  self.textbox__replace_selection = function(t)
  {
    change_replace(t);
  }

  // if 's' is not undefined, sets the text in the textbox; in any
  // case returns the current text
  //
  self.textbox__text = function(s)
  {
    if (s != undefined)
      change(s, undefined);

    return text_;
  }

  var change_replace = function(new_text, new_sel)
  {
    var s = normalized_selection();
    var t = text_.substring(0, s.first) + new_text + text_.substring(s.last);

    if (new_sel != undefined)
      s = {first: new_sel.first, last: new_sel.last};

    change(t, s);
  }

  var change = function(new_text, new_sel)
  {
    var text_changed = false;
    var selection_changed = false;

    if (new_text != undefined)
    {
      text_ = "" + new_text;
      text_changed = true;
    }

    if (new_sel != undefined)
    {
      assert(new_sel.first != undefined);

      if (new_sel.last == undefined)
        new_sel.last = new_sel.first;

      new_sel.first = clamp(new_sel.first, 0, text_.length);
      new_sel.last = clamp(new_sel.last, 0, text_.length);

      if (new_sel.first != sel_.first || new_sel.last != sel_.last)
      {
        sel_.first = new_sel.first;
        sel_.last = new_sel.last;

        selection_changed = true;

      }
    }

    if (text_changed)
    {
      self.changed.fire();
      self.redraw();
    }

    if (selection_changed)
    {
      show_caret();
      self.redraw();

      self.selection_changed.fire();
    }
  };

  // forwards to text()
  //
  self.textbox__caption = function(s)
  {
    return self.text(s);
  }

  // appends the given text
  //
  self.textbox__append = function(s)
  {
    assert(s != undefined);
    change(text_ + s, undefined);
  }

  // returns the index of the start of the word under the caret; if
  // the caret is preceeded by a space, returns the index of the
  // previous word
  //
  self.textbox__previous_word = function()
  {
    var itor = new word_iterator(self.text_);
    var count = 0;
    var last_count = 0;

    while (itor.next())
    {
      var w = itor.word();

      if (sel_.first == count)
        return last_count;
      else if (sel_.first >= count && sel_.first < (count + w.length))
        return count;

      last_count = count;
      count += w.length;
    }

    return last_count;
  }

  // returns the index of the start of the previous word from the
  // caret
  //
  self.textbox__previous_word = function()
  {
    return adjacent_word(text_, sel_.last, false);
  }

  // returns the index of the start of the next word from the caret
  //
  self.textbox__next_word = function()
  {
    return adjacent_word(text_, sel_.last, true);
  }

  // returns the column of the given index
  //
  var column_for_index = function(i)
  {
    return i - line_for_index(i);
  };

  // returns the index of the start of the line on which the given
  // index is
  //
  var line_for_index = function(index)
  {
    var line_start = 0;

    for (var i=index-1; i>=0; --i)
    {
      if (text_[i] == "\n")
      {
        line_start = i + 1;
        break;
      }
    }

    return line_start;
  }

  // returns the index of the start of the the line preceeding the one
  // on which the given index is; if the given line is the first one,
  // returns 0
  //
  var previous_line_for_index = function(index)
  {
    var line_start = line_for_index(index);
    var previous_line_start = 0;

    for (var i=line_start-2; i>= 0; --i)
    {
      if (text_[i] == "\n")
      {
        previous_line_start = i + 1;
        break;
      }
    }

    return previous_line_start;
  }

  // returns the index of the start of the line following the one on
  // which the given index is; if the given line is the last one,
  // returns text_.length;
  //
  var next_line_for_index = function(index)
  {
    var next_line_start = text_.length;
    for (var i=index; i<text_.length; ++i)
    {
      if (text_[i] == "\n")
      {
        next_line_start = i + 1;
        break;
      }
    }

    return next_line_start;
  }

  // returns the index of the character on the same column in the
  // line preceeding the one on which the given index is; if the
  // column is larger than the line's length, returns the line's
  // length; if the given line is the first one, returns 'index'
  //
  var previous_line_same_column = function(index)
  {
    var col = column_for_index(index);
    var line_start = line_for_index(index);

    if (line_start == 0)
      return index;

    var previous_line_start = previous_line_for_index(index);
    var line_length = line_start - previous_line_start;

    if (col >= line_length)
      col = line_length - 1;

    return previous_line_start + col;
  }

  // returns the index of the character on the same column in the
  // line following the one on which the given index is; if the column
  // is larger than the line's length, returns the line's length; if
  // the given line is the last one, returns 'index'
  //
  var next_line_same_column = function(index)
  {
    var col = column_for_index(index);
    var next_line_start = next_line_for_index(index);
    var next_line_end = next_line_for_index(next_line_start);

    if (next_line_start == next_line_end)
      return index;

    if (next_line_end < text_.length)
      --next_line_end;

    var line_length = next_line_end - next_line_start;

    if (col >= line_length)
      col = line_length;

    return next_line_start + col;
  }

  // called when a key is down while the textbox has focus
  //
  self.textbox__on_keydown = function(code)
  {
    if (self.option("unresponsive") || !self.enabled())
      return;

    var rp = self.get_root_panel();

    switch (code)
    {
      case ui.key_codes.left:
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          var p = self.previous_word();

          if (rp.key_state(ui.key_codes.shift))
            change(undefined, {first: sel_.first, last: p});
          else
            change(undefined, {first: p, last: p});
        }
        else
        {
          if (rp.key_state(ui.key_codes.shift))
          {
            change(undefined,
              {first: sel_.first, last: sel_.last - 1});
          }
          else
          {
            if (sel_.first == sel_.last)
            {
              change(undefined,
                {first: sel_.first-1, last: undefined});
            }
            else
            {
              change(undefined,
                {first: Math.min(sel_.first, sel_.last),
                 last: undefined});
            }
          }
        }

        return true;
      }

      case ui.key_codes.right:
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          var p = self.next_word();

          if (rp.key_state(ui.key_codes.shift))
            change(undefined, {first: sel_.first, last: p});
          else
            change(undefined, {first: p, last: p});
        }
        else
        {
          if (rp.key_state(ui.key_codes.shift))
          {
            change(undefined,
              {first: sel_.first, last: sel_.last + 1});
          }
          else
          {
            if (sel_.first == sel_.last)
            {
              change(undefined,
                {first: sel_.first+1, last: undefined});
            }
            else
            {
              change(undefined,
                {first: Math.max(sel_.first, sel_.last),
                 last: undefined});
            }
          }
        }

        return true;
      }

      case ui.key_codes.up:
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          // noop, todo: scroll up
        }
        else
        {
          if (rp.key_state(ui.key_codes.shift))
          {
            var p = previous_line_same_column(sel_.last);
            change(undefined, {first: sel_.first, last: p});
          }
          else
          {
            var s = Math.min(sel_.first, sel_.last);
            var p = previous_line_same_column(s);

            change(undefined, {first: p, last: p});
          }
        }
        
        return true;
      }

      case ui.key_codes.down:
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          // noop, todo: scroll down
        }
        else
        {
          if (rp.key_state(ui.key_codes.shift))
          {
            var p = next_line_same_column(sel_.last);
            change(undefined, {first: sel_.first, last: p});
          }
          else
          {
            var s = Math.max(sel_.first, sel_.last);
            var p = next_line_same_column(s);

            change(undefined, {first: p, last: p});
          }
        }

        return true;
      }

      case ui.key_codes.home:
      {
        var p = line_for_index(sel_.first);

        if (rp.key_state(ui.key_codes.shift))
          change(undefined, {first: sel_.first, last: p});
        else
          change(undefined, {first: p, last: p});

        return true;
      }

      case ui.key_codes.end:
      {
        var p = next_line_for_index(sel_.first);

        if (p < text_.length)
          --p;

        if (rp.key_state(ui.key_codes.shift))
          change(undefined, {first: sel_.first, last: p});
        else
          change(undefined, {first: p, last: p});

        return true;
      }

      case ui.key_codes.back:
      {
        var s = {first: sel_.first, last: sel_.last};

        if (s.first != s.last)
        {
          change_replace("");
        }
        else if (sel_.first > 0)
        {
          change(
            text_.substr(0, s.first-1) + text_.substr(s.first),
            {first: s.first-1, last: undefined});
        }

        return true;
      }

      case ui.key_codes.del:
      {
        if (sel_.first != sel_.last)
        {
          change_replace("");
        }
        else if (sel_.first < text_.length)
        {
          change(
            text_.substr(0, sel_.first) + text_.substr(sel_.first+1),
            undefined);
        }

        return true;
      }

      case ui.key_codes.enter:
      {
        change_replace("\n", {first: sel_.first + 1, last: undefined});
        break;
      }
    }

    return false;
  }

  // called when a key is pressed while the textbox has focus
  //
  self.textbox__on_keypress = function(code)
  {
    if (self.option("unresponsive") || !self.enabled())
      return;

    if (code == 0 || contains(ui.key_codes, code))
      return true;

    //console.log("keypress: " + code);

    var rp = self.get_root_panel();
    var c = String.fromCharCode(code);

    switch (c)
    {
      case "a":   // fall-through
      case "A":
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          self.select_all();
          return true;
        }

        break;
      }
    }

    if (rp.key_state(ui.key_codes.ctrl) || rp.key_state(ui.key_codes.alt))
    {
      // ignore anything else while ctrl or alt is down (or else
      // ctrl-c would insert a 'c')
      return true;
    }

    change_replace(c, {first: sel_.first + 1, last: undefined});

    return true;
  }

  // moves the caret to the hovered character, starts the selection
  //
  self.textbox__on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    if (self.option("unresponsive") || !self.enabled())
      return;

    var now = new Date().getTime();

    var dx = mp.x - last_left_down_.x;
    var dy = mp.y - last_left_down_.y;
    var d = Math.sqrt(dx*dx + dy*dy);

    if (click_count_ == 0)
    {
      // first click in the series
      click_count_ = 1;
    }
    else
    {
      // if that click was fast and close enough, increase the click
      // count (but no more than 3); if not, reset the click count
      // so this is considered a single click
      if (now - last_left_down_time_ < double_click_delay_ &&
          d < double_click_distance_)
      {
        ++click_count_;
        if (click_count_ > 3)
          click_count_ = 1;
      }
      else
      {
        click_count_ = 1;
      }
    }

    if (click_count_ == 1)
    {
      // single click
      var i = self.index_from_point(mp);
      self.selection(i);
      
      start_char_selection();
    }
    else if (click_count_ == 2)
    {
      // double click
      select_word(mp);
      start_word_selection();
    }
    else if (click_count_ == 3)
    {
      // triple click
      self.select_all();
    }
     
    last_left_down_time_ = now;    
    last_left_down_ = mp;
  }

  // stops the selection
  //
  self.textbox__on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (self.option("unresponsive") || !self.enabled())
      return;

    if (selecting_char_)
      stop_char_selection();
    else if (selecting_word_)
      stop_word_selection();
  }

  // further mouse movements will select characters
  //
  var start_char_selection = function()
  {
    assert(selecting_char_ === false);
    assert(selecting_word_ === false);

    self.capture_mouse();
    selecting_char_ = true;
  }

  // stops the character selection
  //
  var stop_char_selection = function()
  {
    assert(selecting_char_ === true);
    assert(selecting_word_ === false);

    selecting_char_ = false;
    self.release_mouse();
  }

  // further mouse movements will select words
  //
  var start_word_selection = function()
  {
    assert(selecting_char_ === false);
    assert(selecting_word_ === false);

    self.capture_mouse();
    selecting_word_ = true;
    original_word_ = {first: sel_.first, last: sel_.last};
  }

  // stops the word selection
  //
  var stop_word_selection = function()
  {
    assert(selecting_char_ === false);
    assert(selecting_word_ === true);

    selecting_word_ = false;
    self.release_mouse();
  }
  
  // selects the word under the cursor
  //
  var select_word = function(mp)
  {
    var i = self.index_from_point(mp);

    // first and last
    var a=0, b=0;

    // first character: select until the end of that word
    if (i == 0)
    {
      a = 0;
      b = adjacent_word(text_, i, true, {keep_whitespace: true});
    }
    else
    {
      if (isspace(text_[i]) && !isspace(text_[i-1]))
      {
        // if the cursor is on a whitespace and the previous character
        // is a non-whitespace, select the previous word

        a = adjacent_word(text_, i, false);
        b = i;
      }
      else if (isspace(text_[i]) && isspace(text_[i-1]))
      {
        // if the cursor is on a whitespace and the previous character
        // is also a whitespace, select from the previous word to the
        // end of the next one
        
        // start of the previous word
        a = adjacent_word(text_, i, false);
        
        // start of the next word
        b = adjacent_word(text_, i, true);

        // end of the next word
        b = adjacent_word(text_, b, true, {keep_whitespace: true});
      }
      else
      {
        // middle of a non-whitespace, select that word
        a = adjacent_word(text_, i, false);
        b = adjacent_word(text_, i, true, {keep_whitespace: true});

        // if the cursor was actually at the beginning of the word,
        // select that word instead
        if (adjacent_word(text_, a, true) == i)
          a = i;
      }
    }

    self.selection(a, b);
  }

  // selects characters if the left button is down
  //
  self.textbox__on_mouse_move = function(mp)
  {
    self.control__on_mouse_move(mp);

    if (self.option("unresponsive") || !self.enabled())
      return;

    var i = self.index_from_point(mp);

    if (selecting_char_)
    {
      self.selection(sel_.first, i);
    }
    else if (selecting_word_)
    {
      var s = normalized_selection();

      if (i >= original_word_.first && i <= original_word_.last)
      {
        // the mouse over behaviour is different over the original
        // word: the caret goes on the first character of the word
        // when the mouse is over it; otherwise, the caret is always
        // at the end of the word
        if (s.first == i)
          self.selection(original_word_.last, original_word_.first);
        else
          self.selection(original_word_.first, original_word_.last);
      }
      else if (i < original_word_.first)
      {
        // select the beginning of the word from 'i'
        //
        // adjacent_word() will return the previous word if 'i' is
        // the first character of a word; word-selection is different,
        // insofar as the cursor needs to be over the character just
        // before a word to select the previous one; hence the i+1
        var a = adjacent_word(text_, i + 1, false);
        self.selection(sel_.first, a);
      }
      else if (i > original_word_.last)
      {
        // select to the end of the next word from 'i'
        var a = adjacent_word(text_, i, true, {keep_whitespace: true});
        self.selection(sel_.first, a);
      }
    }
  }

  // returns the index of the caracter under the given position (in
  // pixels, relative to this control); if the position is before
  // any character, returns 0; if the position is after the last
  // character, returns text().length
  //
  self.textbox__index_from_point = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    if (text_.length == 0)
      return 0;

    var current = 0;

    var got_line = false;
    var last_line_start = 0;
    
    var x = self.option("margin");
    var y = self.option("margin");

    if (p.y <= y)
      got_line = true;

    for (var i=0; i<text_.length; ++i)
    {
      if (got_line || 
          p.y >= y && p.y < (y + g_line_height + g_line_spacing))
      {
        got_line = true;
        
        var cw = text_dimension(text_[i], self.font()).w;
        if (p.x < (x + cw))
          return i;

        x += cw;
      }

      if (text_[i] == "\n")
      {
        last_line_start = i + 1;

        if (got_line)
          return i;

        y += g_line_height + g_line_spacing;
      }
    }

    x = self.option("margin");
    for (var i=last_line_start; i<text_.length; ++i)
    {
      var cw = text_dimension(text_[i], self.font()).w;
      if (p.x < (x + cw))
        return i;

      x += cw;
    }

    return text_.length;
  }

  // resets the caret tick timer and redraws immediately with the
  // caret on
  //
  var show_caret = function()
  {
    hide_caret();

    if (self.option("unresponsive") || !self.enabled())
      return;

    caret_timer_ = setInterval(on_caret_timer, 500);
    caret_ = true;
    self.redraw();
  }

  // clears the caret tick timer and redraws immediately if the caret
  // was visible
  //
  var hide_caret = function()
  {
    if (caret_timer_ != undefined)
    {
      clearInterval(caret_timer_);
      caret_timer_ = undefined;
      self.redraw();
    }
  }
  
  // called when the textbox gets focus, shows the caret
  //
  self.textbox__on_focus = function(other)
  {
    if (self.option("unresponsive") || !self.enabled())
      return;

    show_caret();
  };

  // called when the textbox loses focus, hides the caret
  //
  self.textbox__on_blur = function(other)
  {
    if (self.option("unresponsive") || !self.enabled())
      return;

    hide_caret();
    self.selection(sel_.last);
  }

  // called when the caret tick timer fires, inverts the caret state
  // and redraws
  //
  var on_caret_timer = function()
  {
    caret_ = !caret_;
    self.redraw();
  }

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "textbox";
  }

  self.minimum_size           = self.textbox__minimum_size;
  self.best_dimension         = self.textbox__best_dimension;
  self.draw                   = self.textbox__draw;
  self.selection              = self.textbox__selection;
  self.select_all             = self.textbox__select_all;
  self.replace_selection      = self.textbox__replace_selection;
  self.text                   = self.textbox__text;
  self.caption                = self.textbox__caption;
  self.append                 = self.textbox__append;
  self.previous_word          = self.textbox__previous_word;
  self.previous_word          = self.textbox__previous_word;
  self.next_word              = self.textbox__next_word;
  self.on_keydown             = self.textbox__on_keydown;
  self.on_keypress            = self.textbox__on_keypress;
  self.on_mouse_left_down     = self.textbox__on_mouse_left_down;
  self.on_mouse_left_up       = self.textbox__on_mouse_left_up;
  self.on_mouse_move          = self.textbox__on_mouse_move;
  self.index_from_point       = self.textbox__index_from_point;
  self.on_focus               = self.textbox__on_focus;
  self.on_blur                = self.textbox__on_blur;

  init();
},

textbox: function(opts)
{
  ui.inherit_textbox(this, opts);
}

});   // namespace ui
