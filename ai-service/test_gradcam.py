import traceback
try:
    import tensorflow as tf; import app.gradcam as gc
    model = tf.keras.models.load_model('models/oral_lesion_triage_v1.keras')
    layer_name = gc._find_last_conv_layer(model)
    print('Found layer:', layer_name)
    grad_model = tf.keras.models.Model(inputs=model.inputs, outputs=[model.get_layer(layer_name).output, model.output])
    print('grad_model SUCCESS')
except Exception as e:
    print('EXCEPTION:', type(e).__name__)
    traceback.print_exc()
