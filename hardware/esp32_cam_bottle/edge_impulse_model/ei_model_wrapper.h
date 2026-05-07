#pragma once

// Place the full Edge Impulse Arduino export contents in this directory.
// This wrapper keeps the sketch include stable even if the generated project
// header name changes later.

#if __has_include("EcoDefill_inferencing.h")
#include "EcoDefill_inferencing.h"
#elif __has_include("santosclarenceivanmpdm-beep-project-1_inferencing.h")
#include "santosclarenceivanmpdm-beep-project-1_inferencing.h"
#else
#error "Missing Edge Impulse export. Copy the generated Arduino library files into hardware/esp32_cam_bottle/edge_impulse_model/."
#endif

#include "edge-impulse-sdk/dsp/image/image.hpp"
