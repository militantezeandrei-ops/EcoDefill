# Edge Impulse Model Files

Copy the full Edge Impulse Arduino export for the bottle classifier into this folder.

Expected minimum contents:
- `santosclarenceivanmpdm-beep-project-1_inferencing.h`
- `edge-impulse-sdk/`
- `model-parameters/`
- `tflite-model/`

The bottle sketch includes `edge_impulse_model/ei_model_wrapper.h`, which then
loads the generated inferencing header from this directory.
