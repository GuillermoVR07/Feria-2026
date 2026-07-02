import tensorflow as tf
model = tf.keras.models.load_model('models/oral_lesion_triage_v1.keras')
print([l.name for l in model.layers])
try:
    l = model.get_layer('MobileNetV3Small')
    print('Got it!', l)
except Exception as e:
    print('Failed!', type(e), e)
