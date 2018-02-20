import * as assert from "./util/assert";
import { Device, Target, SYM_STACK_DRAW_FRAMEBUFFER } from "./device";
import {
    Texture,
    TextureColorInternalFormat as ColorFormat,
    TextureDepthInternalFormat as DepthFormat,
    TextureDepthStencilInternalFormat as DepthStencilFormat,
} from "./texture";

export class Framebuffer {

    /**
     * Create a framebuffer containg one or more color buffers with given
     * width and height.
     */
    static withColor(
        dev: Device,
        width: number,
        height: number,
        color: Texture<ColorFormat> | Texture<ColorFormat>[],
    ): Framebuffer {
        const colors = Array.isArray(color) ? color : [color];
        assert.nonEmpty(colors, "color");
        colors.forEach(buffer => {
            assert.equal(width, buffer.width, "width");
            assert.equal(height, buffer.height, "height");
        });

        return new Framebuffer(dev, width, height, colors);
    }

    /**
     * Create a framebuffer containg a depth buffer with given width and height.
     */
    static withDepth(
        dev: Device,
        width: number,
        height: number,
        depth: Texture<DepthFormat>,
    ): Framebuffer {
        assert.equal(width, depth.width, "width");
        assert.equal(height, depth.height, "height");
        return new Framebuffer(dev, width, height, [], depth, true);
    }

    /**
     * Create a framebuffer containg a depth-stencil buffer with given
     * width and height.
     */
    static withDepthStencil(
        dev: Device,
        width: number,
        height: number,
        depthStencil: Texture<DepthStencilFormat>,
    ): Framebuffer {
        assert.equal(width, depthStencil.width, "width");
        assert.equal(height, depthStencil.height, "height");
        return new Framebuffer(dev, width, height, [], depthStencil, false);
    }

    /**
     * Create a framebuffer containg one or more color buffers and a depth
     * buffer with given width and height.
     */
    static withColorDepth(
        dev: Device,
        width: number,
        height: number,
        color: Texture<ColorFormat> | Texture<ColorFormat>[],
        depth: Texture<DepthFormat>,
    ): Framebuffer {
        const colorBuffers = Array.isArray(color) ? color : [color];
        assert.nonEmpty(colorBuffers, "color");
        colorBuffers.forEach(buffer => {
            assert.equal(width, buffer.width, "width");
            assert.equal(height, buffer.height, "height");
        });
        assert.equal(width, depth.width, "width");
        assert.equal(height, depth.height, "height");

        return new Framebuffer(dev, width, height, colorBuffers, depth, true);
    }

    /**
     * Create a framebuffer containg one or more color buffers and a
     * depth-stencil buffer with given width and height.
     */
    static withColorDepthStencil(
        dev: Device,
        width: number,
        height: number,
        color: Texture<ColorFormat> | Texture<ColorFormat>[],
        depthStencil: Texture<DepthStencilFormat>,
    ): Framebuffer {
        const colors = Array.isArray(color) ? color : [color];
        assert.nonEmpty(colors, "color");
        colors.forEach(buffer => {
            assert.equal(width, buffer.width, "width");
            assert.equal(height, buffer.height, "height");
        });
        assert.equal(width, depthStencil.width, "width");
        assert.equal(height, depthStencil.height, "height");

        return new Framebuffer(dev, width, height, colors, depthStencil, false);
    }


    readonly width: number;
    readonly height: number;

    readonly glFramebuffer: WebGLFramebuffer | null;

    private dev: Device;
    private glColorAttachments: number[];

    private framebufferTarget: Target | null;

    private colors: Texture<ColorFormat>[];
    private depthStencil?: Texture<DepthFormat> | Texture<DepthStencilFormat>;
    private depthOnly: boolean;

    private constructor(
        dev: Device,
        width: number,
        height: number,
        colors: Texture<ColorFormat>[],
        depthStencil?: Texture<DepthFormat> | Texture<DepthStencilFormat>,
        depthOnly: boolean = true,
    ) {
        this.dev = dev;
        this.width = width;
        this.height = height;
        this.colors = colors;
        this.depthStencil = depthStencil;
        this.depthOnly = depthOnly;
        this.glColorAttachments = colors
            .map((_, i) => dev.gl.COLOR_ATTACHMENT0 + i);
        this.glFramebuffer = null;
        this.framebufferTarget = null;

        this.init();
    }

    /**
     * Force framebuffer reinitialization.
     */
    init(): void {
        const {
            width,
            height,
            dev,
            dev: { gl, [SYM_STACK_DRAW_FRAMEBUFFER]: stackDrawFramebuffer },
            glColorAttachments,
            colors,
            depthStencil,
            depthOnly,
        } = this;

        const fbo = gl.createFramebuffer();

        stackDrawFramebuffer.push(fbo);

        colors.forEach((buffer, i) => {
            gl.framebufferTexture2D(
                gl.DRAW_FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0 + i,
                gl.TEXTURE_2D,
                buffer.glTexture,
                0,
            );
        });

        if (depthStencil) {
            gl.framebufferTexture2D(
                gl.DRAW_FRAMEBUFFER,
                depthOnly ? gl.DEPTH_ATTACHMENT : gl.DEPTH_STENCIL_ATTACHMENT,
                gl.TEXTURE_2D,
                depthStencil,
                0,
            );
        }

        const status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);

        stackDrawFramebuffer.pop();

        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            gl.deleteFramebuffer(fbo);
            throw new Error("Framebuffer not complete");
        }

        (this as any).glFramebuffer = fbo;

        if (fbo) {
            this.framebufferTarget = new Target(
                dev,
                glColorAttachments,
                fbo,
                width,
                height,
            );
        }
    }

    /**
     * Reinitialize invalid framebuffer, eg. after context is lost.
     */
    restore(): void {
        const {
            dev: { gl },
            glFramebuffer,
            colors,
            depthStencil,
        } = this;
        colors.forEach(buffer => buffer.restore());
        if (depthStencil) { depthStencil.restore(); }
        if (!gl.isFramebuffer(glFramebuffer)) { this.init(); }
    }

    /**
     * Request a render target from this framebuffer to draw into. The target
     * will contain all attached color buffers.
     *
     * Drawing should be done within the callback by
     * calling `ratget.clear()` or `target.draw()` family of methods.
     *
     * Also see `device.target()`.
     */
    target(cb: (rt: Target) => void): void {
        if (this.framebufferTarget) { this.framebufferTarget.with(cb); }
    }
}
