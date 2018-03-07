package processing.merge

import java.util.ArrayList
import org.rdfhdt.hdt.enums.RDFNotation
import org.rdfhdt.hdt.hdt.HDTManager
import org.rdfhdt.hdt.options.HDTSpecification
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.io.InputStreamReader
import org.rdfhdt.hdt.ops.merge.HDTMergeMulti
import org.rdfhdt.hdt.ops.merge.data.MergeData
import org.rdfhdt.hdt.ops.merge.data.MergeDataFile
import storage.SmartResource
import storage.SmartResource._
import scala.collection.JavaConversions._

object HdtSave {

  def saveTriples(ntriples: String, file: String) {
    println("HDT File:" + file)
    val uid = java.util.UUID.randomUUID().toString + ".delta"
    val hdtResource = SmartResource.apply(file, "hdt").getLatest
    val deltaResource = SmartResource.apply(uid, "nt")
    val deltaHdtResource = SmartResource.apply(uid, "hdt")
    println("HDT File Save:" + hdtResource.innerUrl())
    val deltaFile = new File(deltaResource.innerUrl())
    if (!deltaFile.exists()) {
      deltaFile.createNewFile()
    }
    val fw = new FileWriter(deltaFile)
    val bw = new BufferedWriter(fw)
    bw.write(ntriples)
    bw.close()
    val delatHdt = HDTManager.generateHDT(deltaResource.innerUrl(), "http://example.com/mydataset", RDFNotation.parse("ntriples"), 
      new HDTSpecification(), null)
    delatHdt.saveToHDT(deltaHdtResource.innerUrl(), null)
    val list = new ArrayList[MergeData]()
    list.add(new MergeDataFile(new File(deltaHdtResource.innerUrl()), false))
    list.add(new MergeDataFile(new File(hdtResource.innerUrl()), false))
    HDTMergeMulti.process(list.iterator(), new File(hdtResource.innerUrl()), "http://smarterdata/merged", 
      0)
    deltaResource.remove()
    deltaHdtResource.remove()
  }

  private def executeMerge(input1: String, 
      input2: String, 
      out: String, 
      command: String, 
      loc: String): String = {
    val output = new StringBuffer()
    var p: Process = null
    try {
      // FIXME: ND, we cannot use exec to run this command without 
      p = Runtime.getRuntime.exec(Array(command, input1, input2, out), Array("PATH=" + System.getenv("PATH")), 
        new File(loc))
      p.waitFor()
      var reader: BufferedReader = null
      reader = if (p.exitValue() == 0) new BufferedReader(new InputStreamReader(p.getInputStream)) else new BufferedReader(new InputStreamReader(p.getErrorStream))
      var line = ""
      while ((line = reader.readLine()) != null) {
        output.append(line + "\n")
      }
      println(output)
    } catch {
      case e: Exception => {
        println(e)
        e.printStackTrace()
      }
    }
    output.toString
  }
}
