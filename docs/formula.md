# L-Shape Stone Volume — Formula Derivation & Proof

## Cross-Section Geometry

The L-shaped stone has the following cross-section (viewed from the end):

```
         ←───────── W ──────────→
         ┌──────────────────────╲ ← 45° chamfer
    T  { │      flat slab        │
         └──────────┬────────────┘
                    │    lip     │ } Lh
                    │←── Lw ───→│
                    └────────────┘
```

### Parameters (all in mm)

| Symbol | Meaning                                    |
|--------|--------------------------------------------|
| **L**  | Length of the stone (extrusion depth)       |
| **W**  | Total width of the flat slab               |
| **T**  | Flat thickness (slab height)               |
| **Lw** | Lip width                                  |
| **Lh** | Lip drop height                            |
| **T_r**| Edge depth — leg length (chamfer) or radius (bullnose) |

## Step 1 — L-Shape Without Edge Treatment

The cross-section is decomposed into two rectangles:

1. **Flat slab**: W × T
2. **Vertical lip**: Lw × Lh

Cross-sectional area:

$$A_{\text{base}} = W \times T + Lw \times Lh$$

Volume (extruded along L):

$$V_{\text{base}} = L \times (W \times T + Lw \times Lh)$$

### Numerical check (L = 1000, W = 700, T = 100, Lw = 150, Lh = 200)

$$V_{\text{base}} = 1000 \times (700 \times 100 + 150 \times 200) = 1000 \times 100{,}000 = 100{,}000{,}000 \text{ mm}^3$$

---

## Step 2a — 45° Chamfer Volume

A 45° chamfer on the top edge removes a **right isosceles triangular prism** running the full length L.

The triangle has two equal legs of length **T_r** (the chamfer depth):

```
        T_r
    ┌────────╲
    │         ╲   ← hypotenuse (not needed)
T_r │          ╲
    └───────────
```

Cross-sectional area of the removed triangle:

$$A_{\text{chamfer}} = \frac{1}{2} \times T_r \times T_r = \frac{T_r^2}{2}$$

Volume of the removed triangular prism:

$$V_{\text{chamfer}} = \frac{T_r^2}{2} \times L$$

### Why **not** use the hypotenuse C?

The hypotenuse is $C = T_r \sqrt{2}$. If you mistakenly substitute C into a formula $\frac{1}{2} C^2 L$:

$$\frac{1}{2} \times (T_r\sqrt{2})^2 \times L = \frac{1}{2} \times 2 T_r^2 \times L = T_r^2 \times L$$

This **doubles** the correct chamfer volume. Using T_r directly avoids this error and eliminates floating-point values entirely.

### Numerical check (T_r = 50, L = 1000)

$$V_{\text{chamfer}} = \frac{50^2}{2} \times 1000 = 1{,}250{,}000 \text{ mm}^3$$

---

## Step 2b — Bullnose (Quarter-Circle) Volume

A bullnose edge rounds the top corner with a **quarter circle** of radius **T_r**.

The removed material is a **square minus a quarter circle**:

```
        T_r
    ┌────────╲
    │    ___╱   ← quarter circle (kept)
T_r │   │       ← removed area is the corners outside the arc
    └───┘
```

Cross-sectional area of the removed material:

$$A_{\text{bullnose}} = T_r^2 - \frac{\pi \, T_r^2}{4} = T_r^2 \left(1 - \frac{\pi}{4}\right)$$

Volume of the removed prism:

$$V_{\text{bullnose}} = T_r^2 \left(1 - \frac{\pi}{4}\right) \times L$$

### Numerical check (T_r = 50, L = 1000)

$$V_{\text{bullnose}} = 50^2 \times (1 - \frac{\pi}{4}) \times 1000 = 2500 \times 0.2146 \times 1000 \approx 536{,}516 \text{ mm}^3$$

### Comparison

| Edge Type | Removed Area (T_r=50) | Removed Volume (L=1000) |
|-----------|----------------------|------------------------|
| 45° Chamfer | 1,250 mm² | 1,250,000 mm³ |
| Bullnose | ≈536.5 mm² | ≈536,516 mm³ |

The bullnose removes approximately **2.3× less** material than the chamfer.

### Auto-fit radius (circle through inner corner)

Given a bullnose circle tangent to the top edge and the right edge, find the radius T_r such that the circle passes exactly through the inner corner at (-Lw, -T) relative to the top-right corner:

$$\sqrt{(Lw - T_r)^2 + (T - T_r)^2} = T_r$$

Squaring and solving the quadratic:

$$T_r^2 - 2(Lw + T) \cdot T_r + (Lw^2 + T^2) = 0$$

$$\boxed{T_r = Lw + T - \sqrt{2 \cdot Lw \cdot T}}$$

**Example:** Lw = 100, T = 100 → T_r = 200 − √20000 ≈ **58.58 mm**

---

## Step 3 — Final Formulas

### 45° Chamfer

$$\boxed{V = L \times \bigl[W \times T + Lw \times Lh\bigr] \;-\; \frac{T_r^2}{2} \times L}$$

### Bullnose (Quarter-Circle)

$$\boxed{V = L \times \bigl[W \times T + Lw \times Lh\bigr] \;-\; T_r^2 \left(1 - \frac{\pi}{4}\right) \times L}$$

### Full numerical check (Chamfer, L=1000, W=700, T=100, Lw=150, Lh=200, T_r=50)

| Component          | Calculation                        | Result (mm³)      |
|--------------------|------------------------------------|--------------------|
| Flat slab          | 1000 × 700 × 100                  | 70,000,000         |
| Lip                | 1000 × 150 × 200                  | 30,000,000         |
| **Base total**     | 70,000,000 + 30,000,000           | **100,000,000**    |
| Chamfer removal    | ½ × 50² × 1000                    | 1,250,000          |
| **Final volume**   | 100,000,000 − 1,250,000           | **98,750,000 mm³** |
| **In m³**          | 98,750,000 ÷ 1,000,000,000        | **0.098750 m³**    |

> [!IMPORTANT]
> All parameters are integers in mm. No floating-point arithmetic is needed for chamfer. Bullnose uses π/4 internally but T_r is still an integer input.

