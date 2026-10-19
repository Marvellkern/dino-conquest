// Phaser's Light2D pipeline, aware of mirrored containers. The rigs mirror enemies by
// giving their container a negative x scale; the stock pipeline reads that as a 180°
// rotation and turns the normals upside down too. Here a mirrored object gets a plain
// reflection instead (normal x flipped), so the rim light lands on the correct side.
export class LitPipeline extends Phaser.Renderer.WebGL.Pipelines.LightPipeline {
  setGameObject(gameObject, frame) {
    const unit = super.setGameObject(gameObject, frame);
    this.mirror(gameObject);
    return unit;
  }

  setTexture2D(texture, gameObject) {
    const unit = super.setTexture2D(texture, gameObject);
    if (gameObject) this.mirror(gameObject);
    return unit;
  }

  mirror(go) {
    let flipped = !!go.flipX;
    if (go.parentContainer) {
      const m = go.getWorldTransformMatrix(this._tempMatrix, this._tempMatrix2);
      flipped = m.a * m.d - m.b * m.c < 0;
    }
    if (!flipped) return;
    // The parent just set the 180° matrix for this object; swap in a reflection. NaN makes
    // the next object (flipped or not) rebuild its own matrix, flushing this batch first.
    if (this.vertexCount > 0 && this.currentNormalMapRotation !== null) this.flush();
    const M = this.inverseRotationMatrix;
    M[0] = -1; M[1] = 0; M[3] = 0; M[4] = 1;
    this.setMatrix3fv('uInverseRotationMatrix', false, M);
    this.currentNormalMapRotation = NaN;
  }
}

export function registerLitPipeline(game) {
  const pipes = game.renderer?.pipelines;
  if (pipes && !pipes.has('Lit')) pipes.add('Lit', new LitPipeline({ game }));
}
