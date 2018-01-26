import {
    Device,
    Command,
    BlendFunc,
    AttributeData,
} from "./lib/glutenfree.es.js";
import * as bunny from "./lib/bunny.js"

const dev = Device.mount();
const [width, height] = [dev.bufferWidth, dev.bufferHeight];

const view = mat4.create();

const cmd = Command.create(
    dev,
    `#version 300 es
        precision mediump float;

        uniform mat4 u_projection, u_model, u_view;

        layout (location = 0) in vec3 a_position;

        void main() {
            gl_Position = u_projection
                * u_view
                * u_model
                * vec4(a_position, 1.0);
        }
    `,
    `#version 300 es
        precision mediump float;

        out vec4 f_color;

        void main() {
            f_color = vec4(0.1, 1.0, 0.3, 1.0);
        }
    `,
    {
        uniforms: {
            u_projection: {
                type: "matrix4fv",
                value: mat4.perspective(
                    mat4.create(),
                    Math.PI / 4,
                    width / height,
                    0.1,
                    1000,
                ),
            },
            u_model: {
                type: "matrix4fv",
                value: mat4.identity(mat4.create()),
            },
            u_view: {
                type: "matrix4fv",
                value: time => mat4.lookAt(
                    view,
                    [30 * Math.cos(time / 1000), 2.5, 30 * Math.sin(time / 1000)],
                    [0, 2.5, 0],
                    [0, 1, 0]
                ),
            },
        },
        blend: {
            func: {
                src: BlendFunc.CONSTANT_ALPHA,
                dst: BlendFunc.ONE_MINUS_CONSTANT_ALPHA,
            },
            color: [0, 0, 0, 0.2],
        },
    },
);

const attrs = AttributeData.indexed(
    dev,
    bunny.elements,
    cmd.locate({ a_position: bunny.positions }),
);

const loop = time => {
    dev.target(rt => {
        rt.clearColor(0, 0, 0, 1);
        rt.draw(cmd, attrs, time);
    });
    window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);
