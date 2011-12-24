// $Id$

// 2d point
//
function point(x, y)
{
  this.internal_is_a_point = true;

  this.x = x;
  this.y = y;
}

// width and height
//
function dimension(w, h)
{
  this.internal_is_a_dimension = true;

  this.w = w;
  this.h = h;
}

// careful: width and height
//
function rectangle(x, y, w, h)
{
  this.internal_is_a_rectangle = true;

  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
}

// returns a copy of rectangle 'r' offset by x and y
//
function offset_rect(r, x, y)
{
  assert(valid_bounds(r));
  assert(is_number(x) && is_number(y));

  var rr = clone(r);

  rr.x += x;
  rr.y += y;

  return rr;
}

// returns whether 'p' is in 'r'
//
function in_rectangle(p, r)
{
  assert(p != undefined && p.internal_is_a_point);
  assert(valid_bounds(r));

  if (p.x >= r.x && p.x < (r.x + r.w))
    if (p.y >= r.y && p.y < (r.y + r.h))
      return true;
  return false;
}

// makes sure width and height are positive
//
function normalize_rectangle(r)
{
  if (r.w < 0)
  {
    r.x += r.w;
    r.w = Math.abs(r.w);
  }

  if (r.h < 0)
  {
    r.y += r.h;
    r.h = Math.abs(r.h);
  }

  return r;
}

// deflates 'r' by 'm' on each side
//
function deflate(r, m)
{
  assert(r.internal_is_a_rectangle);

  r.x += m;
  r.y += m;
  r.w -= m*2;
  r.h -= m*2;

  return r;
}
