from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app, raise_server_exceptions=False)


def test_mlops_use_cases_expose_required_stage_coverage():
    response = client.get("/api/mlops/use-cases")
    assert response.status_code == 200

    data = response.json()
    assert "use_cases" in data
    assert len(data["use_cases"]) >= 4

    required = {"ingestion", "eda", "preprocessing", "training", "validation", "serving"}
    for use_case in data["use_cases"]:
        assert use_case["stage_count"] >= 6
        assert use_case["minimum_contract_requirement_met"] is True
        assert required.issubset(set(use_case["required_stages_present"]))


def test_mlops_use_case_detail_includes_integration_and_monitoring():
    response = client.get("/api/mlops/use-cases/money_detection")
    assert response.status_code == 200

    data = response.json()
    stages = {contract["lifecycle_stage"] for contract in data["contracts"]}
    assert "integration" in stages
    assert "monitoring" in stages
    assert data["minimum_contract_requirement_met"] is True


def test_mlops_contract_detail_returns_repo_backed_contract():
    response = client.get("/api/mlops/use-cases/bill_classification/contracts/training")
    assert response.status_code == 200

    data = response.json()
    assert data["service_name"] == "Bill Classifier Training Service"
    assert "scripts/24_train_bill_classifier.py" in data["implementation_refs"]
    assert data["implementation_type"] == "script"


def test_mlops_unknown_use_case_returns_404():
    response = client.get("/api/mlops/use-cases/not-real")
    assert response.status_code == 404
    assert "detail" in response.json()
