#### CDK Construct Analyzer

`@cdklabs/cdk-construct-analyzer` is a CLI and library for evaluating the quality of construct libraries.

It calculates a single score (0–100) based on three equally weighted aspects:

* **Maintenance**: Is the project actively maintained and are owners/maintainers responsive?
* **Quality**: Does the project have good docs, tests, linting, and hygiene?
* **Popularity**: How widely is the library adopted in the community?

Each package is scored on their latest version. Scores are unlikely to change drasically between versions.

#### CLI Usage

```> cdk-construct-analyzer --help

Usage: cdk-construct-analyzer [package] [options]

Arguments:
  package   Name of the construct package to score (Scored on the latest version)

Options:
 --verbose  Show detailed breakdown of signals
 --help     Show this help message
```

You can run it locally on any library published to npm by providing its package name:

```> cdk-construct-analyzer cdk-ecr-codedeploy

LIBRARY: @cdklabs/cdk-ecr-codedeploy
VERSION: 0.0.421

OVERALL SCORE: 76/100

---

SUBSCORES
  Maintenance :            66/100
  Quality     :            75/100
  Popularity  :            88/100
```

Add `--verbose` for a detailed breakdown:

```> cdk-construct-analyzer cdk-ecr-codedeploy --verbose

LIBRARY: cdk-ecr-codedeploy
VERSION: 0.0.421

OVERALL SCORE: 76/100

---

SUBSCORES
  Maintenance :            66/100
  Quality     :            75/100
  Popularity  :            88/100
  
---

=== Maintenance ===                               SCORE  WEIGHT
— Time to first response......................... ★★☆☆☆    3
— Provenance Verification ....................... ★★★★★    3
— Number of Contributors ........................ ★★★★☆    2

=== Quality ===                                   SCORE  WEIGHT
— Documentation Completeness .................... ★★★★★    3

=== Popularity ===                                SCORE  WEIGHT
— Weekly Downloads .............................. ★★★★★    3
— Repo stars .................................... ★★★★☆    2
— Contributors .................................. ★★★★☆    1
```

#### Scoring Pillars and Signals

The scoring algorithm evaluates each construct on three pillars with multiple weighted signals as support:

##### Maintenance

Helps determine if the project is active and healthy, or abandoned. Signals include:

* Time to first response: Fast issue resolution reflects active, responsive maintainers.
* Provenance Verification: Verifies package authenticity and supply chain security.
* Number of Contributors: More contributors reduce risk of abandonment and reflect shared maintenance.

##### Quality

Signals that are visible in the repo/package that showcases quality:

* Documentation Completeness: High quality documentation makes the project easier to adopt and use (README, API References, Usage Examples).

##### Popularity

Signals that reflect adoption and community size:

* Contributors: More contributors typically indicate shared maintenance and community trust.
* Weekly Downloads: High or rising download counts suggest the library is being actively used.
* Repo stars: Stars represent general developer interest and visibility on GitHub.

#### Scoring Weights

Not every signal has the same impact on library , so each signal is assigned an importance level. A signal with
importance level 3 will carry 3× the weight of a signal with importance level 1:

* **3 — Critical** signals that strongly influence a library’s overall health and usability (3 points)
* **2 — Valuable** indicators that support confidence but aren’t decisive signals (2 points)
* **1 — Supportive** or “nice to have” checks (1 points)

When calculating a subscore (Maintenance, Quality, Popularity), each signal’s grade is weighted by its importance.
Once all signals in a category are evaluated, the score is normalized to a 0–100 scale. This ensures that categories
with more signals don’t automatically outweigh others.
Finally, the three pillar scores are combined into the overall score using equal weights:

* **Maintenance**
* **Quality**
* **Popularity**