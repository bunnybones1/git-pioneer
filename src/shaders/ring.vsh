//varying vec2 vUv;
uniform float progress;
uniform float thickness;
uniform float offset;
uniform float bias;
void main() {
//	vUv = uv;
	float progress2 = 1.0 - abs(progress - 1.0);
	float offset2 = 0.0;
	if(progress > 1.0) {
		offset2 = 1.0 - progress2;
	}
	float angle = (position.x * progress2 + offset2) * 6.28318530718;
	float bias2 = bias * 0.5;
	float distance = (position.y - bias2) * thickness + bias2 - (offset * 0.5);
	float x = cos(angle) * distance;
	float y = sin(angle) * distance;
	vec3 pos = vec3(x, y, position.z);

	gl_Position = projectionMatrix *
		modelViewMatrix *
		vec4(pos, 1.0);
}