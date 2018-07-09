//varying vec2 vUv;
uniform vec3 color;
void main() {
//	vUv = uv;
	gl_FragColor = vec4(color, 1.0);
}