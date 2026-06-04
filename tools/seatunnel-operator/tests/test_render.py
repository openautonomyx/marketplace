"""Offline unit tests for the seatunnel-operator render/status layer.

These exercise the pure functions (no cluster, no kubectl). Run with:

    python3 -m unittest discover -s tools/seatunnel-operator/tests
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import seatunnel_operator as op  # noqa: E402


def _cr(**spec_overrides):
    spec = {
        "image": "localhost:32000/seatunnel-salesforce:dev",
        "engine": "local",
        "config": "env {}\nsource { Console {} }\nsink { Console {} }\n",
        "secretRef": "salesforce-credentials",
        "backoffLimit": 1,
    }
    spec.update(spec_overrides)
    return {
        "apiVersion": op.API_VERSION,
        "kind": op.KIND,
        "metadata": {
            "name": "salesforce-to-console",
            "namespace": "default",
            "uid": "abc-123",
            "generation": 2,
        },
        "spec": spec,
    }


class TestSpecHash(unittest.TestCase):
    def test_stable_and_sensitive(self):
        a = op.spec_hash(_cr()["spec"])
        b = op.spec_hash(_cr()["spec"])
        self.assertEqual(a, b)  # deterministic
        c = op.spec_hash(_cr(query=None, config="env {}\n")["spec"])
        self.assertNotEqual(a, c)  # config change -> different hash

    def test_names_include_hash(self):
        cr = _cr()
        job, cm = op._names(cr)
        self.assertTrue(job.startswith("salesforce-to-console-"))
        self.assertEqual(job, cm)
        self.assertEqual(job.rsplit("-", 1)[1], op.spec_hash(cr["spec"]))


class TestRenderConfigMap(unittest.TestCase):
    def test_shape(self):
        cm = op.render_configmap(_cr())
        self.assertEqual(cm["kind"], "ConfigMap")
        self.assertEqual(cm["metadata"]["namespace"], "default")
        self.assertIn(op.CONFIG_FILE_NAME, cm["data"])
        self.assertEqual(cm["metadata"]["ownerReferences"][0]["uid"], "abc-123")
        self.assertTrue(cm["metadata"]["ownerReferences"][0]["controller"])


class TestRenderJob(unittest.TestCase):
    def test_basic_shape(self):
        job = op.render_job(_cr())
        self.assertEqual(job["kind"], "Job")
        self.assertEqual(job["spec"]["backoffLimit"], 1)
        c = job["spec"]["template"]["spec"]["containers"][0]
        self.assertEqual(c["image"], "localhost:32000/seatunnel-salesforce:dev")
        self.assertIn("--config", c["args"][0])
        self.assertIn("-e local", c["args"][0])
        self.assertEqual(c["envFrom"][0]["secretRef"]["name"], "salesforce-credentials")

    def test_no_secret_means_no_envfrom(self):
        cr = _cr()
        del cr["spec"]["secretRef"]
        job = op.render_job(cr)
        c = job["spec"]["template"]["spec"]["containers"][0]
        self.assertNotIn("envFrom", c)

    def test_default_resources_when_unset(self):
        job = op.render_job(_cr())
        c = job["spec"]["template"]["spec"]["containers"][0]
        self.assertEqual(c["resources"], op.DEFAULT_RESOURCES)

    def test_active_deadline_passthrough(self):
        job = op.render_job(_cr(activeDeadlineSeconds=600))
        self.assertEqual(job["spec"]["activeDeadlineSeconds"], 600)

    def test_engine_flag(self):
        job = op.render_job(_cr(engine="cluster"))
        c = job["spec"]["template"]["spec"]["containers"][0]
        self.assertIn("-e cluster", c["args"][0])

    def test_config_and_job_share_configmap_name(self):
        cr = _cr()
        cm = op.render_configmap(cr)
        job = op.render_job(cr)
        vol = job["spec"]["template"]["spec"]["volumes"][0]["configMap"]["name"]
        self.assertEqual(vol, cm["metadata"]["name"])


class TestPhaseMapping(unittest.TestCase):
    def test_succeeded(self):
        job = {"status": {"conditions": [{"type": "Complete", "status": "True", "message": "done"}]}}
        phase, msg = op.phase_from_job_status(job)
        self.assertEqual(phase, op.PHASE_SUCCEEDED)
        self.assertEqual(msg, "done")

    def test_failed(self):
        job = {"status": {"conditions": [{"type": "Failed", "status": "True"}]}}
        self.assertEqual(op.phase_from_job_status(job)[0], op.PHASE_FAILED)

    def test_running(self):
        job = {"status": {"active": 1}}
        self.assertEqual(op.phase_from_job_status(job)[0], op.PHASE_RUNNING)

    def test_pending_when_empty(self):
        self.assertEqual(op.phase_from_job_status({})[0], op.PHASE_PENDING)
        self.assertEqual(op.phase_from_job_status(None)[0], op.PHASE_PENDING)


class TestDesiredObjects(unittest.TestCase):
    def test_returns_configmap_then_job(self):
        objs = op.desired_objects(_cr())
        self.assertEqual([o["kind"] for o in objs], ["ConfigMap", "Job"])


if __name__ == "__main__":
    unittest.main()
