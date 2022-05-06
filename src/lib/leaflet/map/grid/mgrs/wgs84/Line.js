export default class Line {
  points = []
  p1
  p2

  constructor (p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }

  addPoint (point) {
    this.points.add(point);
  }

  getPoints () {
    return this.points
  }
}
