# Document Service Improvements

## Problem

The document service was experiencing frequent timeout issues when analyzing documents, even for small documents (3,585 characters). The timeout calculation was too conservative and didn't account for model loading times.

## Root Cause Analysis

1. **Conservative Timeout Calculation**: Small documents (< 5000 chars) were limited to 60 seconds, which wasn't enough for model loading + processing
2. **Model Loading Time**: Models need to be loaded into memory, which can take 5-15 seconds
3. **Insufficient Retry Logic**: Only 2 retry attempts with fixed timeout increases
4. **No Model Warm-up**: Models were loaded cold for each analysis

## Improvements Made

### 1. Enhanced Timeout Calculation (`calculate_timeout` method)

- **Before**: Small documents (< 5000 chars) limited to 60 seconds
- **After**: Small documents now get 90-120 seconds depending on size
- **Logic**: More generous timeouts for small documents to account for model loading time

```python
# New timeout calculation for small documents:
if text_length < 500:
    return min(120.0, base_timeout * 1.2)  # 120% of base timeout, max 120s
elif text_length < 1000:
    return min(90.0, base_timeout * 1.0)   # 100% of base timeout, max 90s
elif text_length < 5000:
    return min(120.0, base_timeout * 1.0)  # 100% of base timeout, max 120s
```

### 2. Model Warm-up Mechanism (`_warm_up_model` method)

- **New Feature**: Pre-loads the model into memory before document processing
- **Benefit**: Reduces timeout issues by eliminating cold start delays
- **Implementation**: Sends a simple "Hello" request to warm up the model

```python
async def _warm_up_model(self, model: str) -> None:
    """Warm up the model by sending a simple request to load it into memory"""
    warm_up_prompt = "Hello, this is a warm-up request."
    await ollama_service.query_ollama(warm_up_prompt, 30.0, model)
```

### 3. Improved Retry Logic

- **Before**: 2 attempts with 1.5x timeout increase
- **After**: 3 attempts for small documents, 2 for large documents
- **Logic**: Progressive timeout increases (100%, 150%, 200% of original)

```python
max_attempts = 3 if len(combined_text) < 10000 else 2
for attempt in range(max_attempts):
    current_timeout = timeout * (1.0 + (attempt * 0.5))  # 100%, 150%, 200%
```

### 4. Enhanced Ollama Service Health Checks

- **New Feature**: Better connection and model availability checking
- **New Feature**: Model response testing with timing information
- **Benefit**: Better diagnostics for timeout issues

```python
async def check_connection(self) -> Dict[str, Any]:
    # Returns detailed health information

async def test_model_response(self, model: str, timeout: float = 30.0) -> Dict[str, Any]:
    # Tests if a specific model can respond with timing info
```

### 5. Better Error Handling and Logging

- **Enhanced**: More detailed logging for debugging timeout issues
- **Improved**: Better error messages and fallback handling
- **Added**: Progress updates during model warm-up

## Test Results

The improvements were tested with a comprehensive test script:

```
✅ Ollama is healthy. Available models: 11 models
✅ phi3:mini responded successfully in 3.99s
✅ llama3:latest responded successfully in 9.84s
✅ Document analysis completed successfully in 120s timeout
```

## Configuration

The improvements work with the existing settings:

```json
{
  "document": {
    "TIMEOUT": 600
  }
}
```

## Backward Compatibility

All improvements are backward compatible and don't require changes to:

- API endpoints
- Frontend integration
- Existing settings
- Document processing logic

## Performance Impact

- **Positive**: Reduced timeout failures for small documents
- **Minimal**: Model warm-up adds ~3-10 seconds to first request
- **Improved**: Better retry logic reduces overall failure rate

## Monitoring

The enhanced logging provides better visibility into:

- Model warm-up status
- Timeout calculation decisions
- Retry attempts and timing
- Model response times
