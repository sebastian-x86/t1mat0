package main

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
)

type rgba struct{ r, g, b, a float64 }

func blend(dst rgba, src rgba, cov float64) rgba {
	a := src.a * cov
	if a <= 0 {
		return dst
	}
	out := rgba{}
	out.a = a + dst.a*(1-a)
	if out.a == 0 {
		return rgba{}
	}
	out.r = (src.r*a + dst.r*dst.a*(1-a)) / out.a
	out.g = (src.g*a + dst.g*dst.a*(1-a)) / out.a
	out.b = (src.b*a + dst.b*dst.a*(1-a)) / out.a
	return out
}

// ellipse reports whether (x, y) sits inside an ellipse rotated by deg.
func ellipse(x, y, cx, cy, rx, ry, deg float64) bool {
	rad := deg * math.Pi / 180
	dx, dy := x-cx, y-cy
	nx := dx*math.Cos(rad) + dy*math.Sin(rad)
	ny := -dx*math.Sin(rad) + dy*math.Cos(rad)
	return (nx*nx)/(rx*rx)+(ny*ny)/(ry*ry) <= 1
}

func sample(x, y float64) rgba {
	out := rgba{}

	// Leaves and stem sit behind the fruit.
	for _, deg := range []float64{0, 72, 144, 216, 288} {
		if ellipse(x, y, 0.5+0.115*math.Cos(deg*math.Pi/180), 0.235+0.115*math.Sin(deg*math.Pi/180), 0.135, 0.05, deg) {
			out = blend(out, rgba{0.26, 0.51, 0.20, 1}, 1)
		}
	}
	if ellipse(x, y, 0.5, 0.17, 0.035, 0.075, 0) {
		out = blend(out, rgba{0.22, 0.44, 0.17, 1}, 1)
	}

	// Body with a soft radial shading from the upper left.
	if ellipse(x, y, 0.5, 0.585, 0.425, 0.385, 0) {
		d := math.Hypot((x-0.38)/0.5, (y-0.44)/0.5)
		shade := math.Min(1, math.Max(0, d))
		c := rgba{
			0.93 - 0.30*shade,
			0.22 - 0.10*shade,
			0.17 - 0.07*shade,
			1,
		}
		out = blend(out, c, 1)
	}

	// Dimple where the fruit meets the stem.
	if ellipse(x, y, 0.5, 0.245, 0.10, 0.05, 0) {
		out = blend(out, rgba{0.62, 0.13, 0.11, 1}, 0.85)
	}

	// Highlight.
	if ellipse(x, y, 0.355, 0.435, 0.105, 0.062, -28) {
		out = blend(out, rgba{1, 1, 1, 1}, 0.32)
	}
	if ellipse(x, y, 0.68, 0.72, 0.06, 0.04, 25) {
		out = blend(out, rgba{1, 1, 1, 1}, 0.10)
	}
	return out
}

func render(size int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	const ss = 4
	for py := 0; py < size; py++ {
		for px := 0; px < size; px++ {
			var r, g, b, a float64
			for sy := 0; sy < ss; sy++ {
				for sx := 0; sx < ss; sx++ {
					x := (float64(px) + (float64(sx)+0.5)/ss) / float64(size)
					y := (float64(py) + (float64(sy)+0.5)/ss) / float64(size)
					c := sample(x, y)
					r += c.r * c.a
					g += c.g * c.a
					b += c.b * c.a
					a += c.a
				}
			}
			n := float64(ss * ss)
			if a > 0 {
				r, g, b = r/a, g/a, b/a
			}
			a /= n
			img.Set(px, py, color.NRGBA{
				R: uint8(math.Round(r * 255)),
				G: uint8(math.Round(g * 255)),
				B: uint8(math.Round(b * 255)),
				A: uint8(math.Round(a * 255)),
			})
		}
	}
	return img
}

func encode(img *image.RGBA) []byte {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

func writeICO(path string, sizes []int) {
	var blobs [][]byte
	for _, s := range sizes {
		blobs = append(blobs, encode(render(s)))
	}

	var buf bytes.Buffer
	binary.Write(&buf, binary.LittleEndian, uint16(0))
	binary.Write(&buf, binary.LittleEndian, uint16(1))
	binary.Write(&buf, binary.LittleEndian, uint16(len(sizes)))

	offset := 6 + 16*len(sizes)
	for i, s := range sizes {
		dim := byte(s)
		if s >= 256 {
			dim = 0
		}
		buf.WriteByte(dim)
		buf.WriteByte(dim)
		buf.WriteByte(0)
		buf.WriteByte(0)
		binary.Write(&buf, binary.LittleEndian, uint16(1))
		binary.Write(&buf, binary.LittleEndian, uint16(32))
		binary.Write(&buf, binary.LittleEndian, uint32(len(blobs[i])))
		binary.Write(&buf, binary.LittleEndian, uint32(offset))
		offset += len(blobs[i])
	}
	for _, b := range blobs {
		buf.Write(b)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		panic(err)
	}
}

func main() {
	if err := os.WriteFile(os.Args[1], encode(render(1024)), 0o644); err != nil {
		panic(err)
	}
	writeICO(os.Args[2], []int{16, 24, 32, 48, 64, 128, 256})
}
