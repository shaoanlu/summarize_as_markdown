# Summary of "Video Encoding Requires Using Your Eyes | Red Vice"

* URL: https://redvice.org/2025/encoding-requires-eyes/
* Date: 2025-03-02
* Source: Ryan
* Suggested Tags: Video Encoding, Neural Networks, Image Quality, Perceptual Quality, Netflix

## Summary

Ryan critiques a Netflix engineering blog post about using a "deep downscaler" (neural network) for video preprocessing. He argues that perceptual quality is paramount in video encoding and that there's no substitute for visual inspection. He contends that relying solely on metrics like VMAF and PSNR is insufficient and often misleading, particularly when they conflict with skilled human judgment.

Ryan highlights issues with Netflix's approach, including the lack of clarity on the baseline downscaling method, skepticism about tailoring the downscaler to all Netflix content, the training method based on PSNR after bicubic upscaling (which he deems "dumb and brittle"), and the overreliance on potentially misleading metrics. He argues that the results showcased by Netflix exhibit artifacts like ringing, color shifts, and fake detail, rendering the system unacceptable, regardless of metric scores. He suggests that a closed-form solution might be superior.

## Key Points

*   **Perceptual Quality is Key:** Human visual assessment is essential in video encoding; metrics are insufficient.
*   **Netflix's Downscaler is Flawed:** The example provided produces undesirable visual artifacts.
*   **Metric Misinterpretation:** Reliance on VMAF, despite poor visual results, indicates misapplication.
*   **Dubious Training Method:** Training via PSNR after bicubic upscaling is a flawed approach.
*   **Over-Engineering:** A closed-form solution likely exists and may be more efficient than the neural network approach.
